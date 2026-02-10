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

export const prisma = global.prisma || new PrismaClient({
  log: logConfig,
});

// Log connection events
prisma.$connect()
  .then(() => log.info('Connected to database'))
  .catch((err) => log.error('Failed to connect to database:', err));

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
