import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { router } from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { setupSocketHandlers } from './sockets';
import { prisma } from './lib/prisma';
import { cache } from './lib/redis';
import { createModuleLogger } from './lib/logger';

const log = createModuleLogger('Server');

// Validate critical env vars at startup
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    log.error(`FATAL: ${envVar} environment variable is not set`);
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);

// Socket.IO setup — optimized for high concurrency
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  // Performance tuning
  pingTimeout: 30000,        // 30s before considering connection dead
  pingInterval: 25000,       // 25s between pings
  maxHttpBufferSize: 1e6,    // 1MB max message size
  connectTimeout: 10000,     // 10s connection timeout
  // Allow websocket upgrade from polling
  allowUpgrades: true,
  transports: ['websocket', 'polling'],
  // Compress data for lower bandwidth
  perMessageDeflate: {
    threshold: 1024,         // Only compress messages > 1KB
  },
});

// Make io available globally
export { io };

// Middlewares
app.use(requestIdMiddleware);
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting (skip for Playwright tests only in non-production)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // 1000 requests per minute in dev
  message: { error: 'Too many requests, please try again later.' },
  skip: (req: Request) => {
    // Skip rate limiting for Playwright E2E tests — only in non-production
    if (process.env.NODE_ENV === 'production') return false;
    return req.headers['x-playwright-test'] === 'true';
  },
});
app.use('/api/', limiter);

// Health check (with DB connectivity) — cached for 5 seconds
let healthCache: { data: Record<string, unknown>; expiry: number } | null = null;
app.get('/health', async (_: Request, res: Response) => {
  const now = Date.now();
  if (healthCache && now < healthCache.expiry) {
    const statusCode = healthCache.data.status === 'ok' ? 200 : 503;
    return res.status(statusCode).json(healthCache.data);
  }

  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch {
    health.status = 'degraded';
    health.database = 'disconnected';
  }

  // Check Redis (optional)
  try {
    const redisOk = await cache.isAvailable();
    health.redis = redisOk ? 'connected' : 'disconnected';
  } catch {
    health.redis = 'disconnected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  healthCache = { data: health, expiry: now + 5000 };
  res.status(statusCode).json(health);
});

// Readiness check (for orchestrators like K8s)
app.get('/ready', async (_: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false, reason: 'database unavailable' });
  }
});

// API Routes
app.use('/api', router);

// Error handler
app.use(errorHandler);

// Socket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  log.info(`Running on http://localhost:${PORT}`);
  log.info('Socket.IO ready');
});

// Periodic cleanup: remove expired/revoked refresh tokens every 6 hours
const TOKEN_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    if (result.count > 0) {
      log.info(`Cleaned up ${result.count} expired/revoked refresh tokens`);
    }
  } catch (err) {
    log.error('Token cleanup failed:', err);
  }
}, TOKEN_CLEANUP_INTERVAL);

// Periodic cleanup: remove old deleted DM messages every 24 hours
const DM_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await prisma.directMessage.deleteMany({
      where: {
        isDeleted: true,
        updatedAt: { lt: thirtyDaysAgo },
      },
    });
    if (result.count > 0) {
      log.info(`Cleaned up ${result.count} soft-deleted DM messages`);
    }
  } catch (err) {
    log.error('DM cleanup failed:', err);
  }
}, DM_CLEANUP_INTERVAL);

// Periodic: clear leaderboard cache every 5 minutes to keep it fresh
const LEADERBOARD_REFRESH_INTERVAL = 5 * 60 * 1000;
setInterval(async () => {
  try {
    await cache.delPattern('leaderboard:*');
  } catch {
    // silently fail
  }
}, LEADERBOARD_REFRESH_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('SIGTERM received. Shutting down gracefully...');
  await cache.disconnect();
  await prisma.$disconnect();
  httpServer.close(() => {
    log.info('Closed');
    process.exit(0);
  });
});
