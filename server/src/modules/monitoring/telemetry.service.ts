import { MonitoringEventType, PremiumTier, prisma } from '../../lib/prisma';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('TelemetryService');

type EventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';
type EventSource = 'api' | 'socket' | 'system' | 'cron';

interface TelemetryEventInput {
  eventType: MonitoringEventType;
  metricKey: string;
  severity?: EventSeverity;
  source?: EventSource;
  requestId?: string;
  userId?: string;
  userTier?: PremiumTier;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

function normalizePath(rawPath?: string): string | undefined {
  if (!rawPath) return undefined;
  const withoutQuery = rawPath.split('?')[0];
  return withoutQuery.slice(0, 500);
}

function safeString(value: string | undefined, max = 255): string | undefined {
  if (!value) return undefined;
  return value.slice(0, max);
}

function severityFromStatus(statusCode?: number): EventSeverity {
  if (!statusCode) return 'info';
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

export const telemetryService = {
  async recordEvent(input: TelemetryEventInput): Promise<void> {
    try {
      await prisma.monitoringEvent.create({
        data: {
          eventType: input.eventType,
          metricKey: safeString(input.metricKey, 120) || 'unknown',
          severity: input.severity || 'info',
          source: input.source || 'api',
          requestId: safeString(input.requestId, 120),
          userId: input.userId,
          userTier: input.userTier,
          path: normalizePath(input.path),
          method: safeString(input.method?.toUpperCase(), 16),
          statusCode: input.statusCode,
          durationMs: input.durationMs,
          ip: safeString(input.ip, 64),
          userAgent: safeString(input.userAgent, 500),
          metadata: input.metadata,
        },
      });
    } catch (error) {
      log.error('Failed to persist telemetry event', { error, metricKey: input.metricKey });
    }
  },

  async recordRequestEvent(payload: {
    requestId?: string;
    userId?: string;
    userTier?: PremiumTier;
    path?: string;
    method?: string;
    statusCode?: number;
    durationMs?: number;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const severity = severityFromStatus(payload.statusCode);
    await this.recordEvent({
      eventType: MonitoringEventType.REQUEST,
      metricKey: 'http.request',
      severity,
      source: 'api',
      requestId: payload.requestId,
      userId: payload.userId,
      userTier: payload.userTier,
      path: payload.path,
      method: payload.method,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      ip: payload.ip,
      userAgent: payload.userAgent,
      metadata: {
        statusFamily: payload.statusCode ? Math.floor(payload.statusCode / 100) : undefined,
      },
    });
  },

  async recordErrorEvent(payload: {
    requestId?: string;
    userId?: string;
    userTier?: PremiumTier;
    path?: string;
    method?: string;
    statusCode?: number;
    ip?: string;
    userAgent?: string;
    errorCode?: string;
    message?: string;
  }): Promise<void> {
    await this.recordEvent({
      eventType: MonitoringEventType.ERROR,
      metricKey: 'api.error',
      severity: payload.statusCode && payload.statusCode < 500 ? 'warn' : 'error',
      source: 'api',
      requestId: payload.requestId,
      userId: payload.userId,
      userTier: payload.userTier,
      path: payload.path,
      method: payload.method,
      statusCode: payload.statusCode,
      ip: payload.ip,
      userAgent: payload.userAgent,
      metadata: {
        errorCode: payload.errorCode,
        message: safeString(payload.message, 500),
      },
    });
  },

  async recordAuthEvent(payload: {
    requestId?: string;
    userId?: string;
    userTier?: PremiumTier;
    path?: string;
    method?: string;
    ip?: string;
    userAgent?: string;
    action: 'login' | 'logout' | 'register' | 'refresh';
    success: boolean;
    reason?: string;
  }): Promise<void> {
    await this.recordEvent({
      eventType: MonitoringEventType.AUTH,
      metricKey: `auth.${payload.action}`,
      severity: payload.success ? 'info' : 'warn',
      source: 'api',
      requestId: payload.requestId,
      userId: payload.userId,
      userTier: payload.userTier,
      path: payload.path,
      method: payload.method,
      ip: payload.ip,
      userAgent: payload.userAgent,
      metadata: {
        success: payload.success,
        reason: payload.reason,
      },
    });
  },
};
