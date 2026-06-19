import { MonitoringEventType, Prisma, prisma } from '../../lib/prisma';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('AiDebug');

type AiDebugSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

type AiDebugEventInput = {
  metricKey: string;
  severity?: AiDebugSeverity;
  source?: 'api' | 'socket' | 'system' | 'cron';
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

function safeString(value: unknown, max = 500) {
  if (value === undefined || value === null) return undefined;
  return String(value).slice(0, max);
}

export async function recordAiDebugEvent(input: AiDebugEventInput) {
  try {
    await prisma.monitoringEvent.create({
      data: {
        eventType: input.severity === 'error' || input.severity === 'critical'
          ? MonitoringEventType.ERROR
          : MonitoringEventType.BUSINESS,
        metricKey: safeString(input.metricKey, 120) || 'ai.unknown',
        severity: input.severity || 'info',
        source: input.source || 'system',
        requestId: safeString(input.requestId, 120),
        userId: input.userId,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    log.error('Failed to persist AI debug event', { error, metricKey: input.metricKey });
  }
}

export async function listAiDebugEvents(limit = 50) {
  const take = Math.min(Math.max(Math.floor(limit) || 50, 1), 200);
  const rows = await prisma.monitoringEvent.findMany({
    where: {
      metricKey: {
        startsWith: 'ai.',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take,
    select: {
      id: true,
      createdAt: true,
      metricKey: true,
      severity: true,
      source: true,
      requestId: true,
      userId: true,
      metadata: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    metricKey: row.metricKey,
    severity: row.severity,
    source: row.source,
    requestId: row.requestId,
    userId: row.userId,
    metadata: row.metadata,
  }));
}

export async function clearAiDebugEvents() {
  const result = await prisma.monitoringEvent.deleteMany({
    where: {
      metricKey: {
        startsWith: 'ai.',
      },
    },
  });

  return {
    deletedCount: result.count,
  };
}
