import { PrismaClient, Prisma, UserGender, DatingPreference, PremiumTier, RelationshipStage, RelationshipEventType, BillingCycle, SubscriptionStatus, MonitoringEventType } from '@prisma/client';
import { createModuleLogger } from './logger';

// Re-export enums and types for use in services
export { Prisma, UserGender, DatingPreference, PremiumTier, RelationshipStage, RelationshipEventType, BillingCycle, SubscriptionStatus, MonitoringEventType };

const log = createModuleLogger('Prisma');

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const logConfig = process.env.NODE_ENV === 'development'
  ? ['query' as const, 'error' as const, 'warn' as const]
  : ['error' as const];

// Connection pool configuration for high concurrency
// Default connection_limit = num_physical_cpus * 2 + 1
// We explicitly set it via DATABASE_URL ?connection_limit=20 or here:
export const prisma = global.prisma || new PrismaClient({
  log: logConfig,
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Log connection events — only connect explicitly, not on module import
// This prevents re-connection on every hot-reload in dev mode
export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
  log.info('Connected to database');
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
