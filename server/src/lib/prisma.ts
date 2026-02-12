import { PrismaClient } from '@prisma/client';
import { createModuleLogger } from './logger';

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

// Log connection events
prisma.$connect()
  .then(() => log.info('Connected to database'))
  .catch((err) => log.error('Failed to connect to database:', err));

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
