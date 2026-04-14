import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import { router } from './routes';
import { handleWebhook } from './modules/payment/payment.controller';
import { errorHandler } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { setupSocketHandlers } from './sockets';
import { prisma, connectPrisma } from './lib/prisma';
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

// Trust proxy — required when running behind Nginx/Cloudflare
// Allows express-rate-limit and req.ip to work correctly with X-Forwarded-For
app.set('trust proxy', 1);

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

// Stripe webhook — must be BEFORE express.json() to receive raw body
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting — per-user for authenticated routes, per-IP for public routes
// This ensures logged-in users get their own generous limit while
// unauthenticated endpoints (login, register, etc.) are still protected by IP.
const isPlaywrightTest = (req: Request) => {
  if (process.env.NODE_ENV === 'production') return false;
  return req.headers['x-playwright-test'] === 'true';
};

// Public routes limiter (IP-based) — for /api/auth/* etc.
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per 15 min per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isPlaywrightTest,
});

// Authenticated routes limiter (per-user via JWT) — generous for normal usage
// Falls back to IP if no user is found (shouldn't happen for authed routes)
const authenticatedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute window
  max: 200,                  // 200 requests per minute per user — enough for tab navigation
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use userId from JWT if available, otherwise fall back to IP
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { userId: string };
        return `user:${decoded.userId}`;
      } catch {
        // Token invalid/expired — fall back to IP
      }
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skip: isPlaywrightTest,
});

// Apply public limiter to auth routes (unauthenticated)
app.use('/api/auth', publicLimiter);
// Apply per-user limiter to all other API routes
app.use('/api/', authenticatedLimiter);

// Health check (with DB connectivity) — cached for 5 seconds
// NOTE: healthCache is per-instance (in-memory). In horizontal scaling scenarios,
// each instance maintains its own cache, so health results may differ briefly between
// instances. This is acceptable because each check still validates live DB/Redis connectivity;
// the cache only reduces redundant checks within the same instance.
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

// Explicitly connect to database (not on module import, to avoid hot-reload reconnects)
connectPrisma().catch((err) => {
  log.error('Failed to connect to database:', err);
  process.exit(1);
});

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

// Periodic reconciliation: check and downgrade expired subscriptions every 1 hour
const SUBSCRIPTION_RECONCILE_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(async () => {
  try {
    const now = new Date();

    // Find subscriptions that have ended (currentPeriodEnd in past) and are not already CANCELED
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { lt: now },
        status: { notIn: ['CANCELED'] },
      },
      include: { user: true },
    });

    let downgraded = 0;
    for (const sub of expiredSubs) {
      // Downgrade user to FREE
      await prisma.user.update({
        where: { id: sub.userId },
        data: {
          isPremium: false,
          premiumTier: 'FREE',
        },
      });

      // Update subscription status
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELED' },
      });

      downgraded++;
    }

    if (downgraded > 0) {
      log.info(`Reconciled ${downgraded} expired subscription(es)`);
    }

    // Clean up orphaned subscriptions (user is FREE with expired premiumExpiresAt)
    const orphaned = await prisma.subscription.findMany({
      where: {
        user: {
          isPremium: false,
          premiumTier: 'FREE',
          premiumExpiresAt: { lt: now },
        },
      },
    });

    if (orphaned.length > 0) {
      await prisma.subscription.updateMany({
        where: {
          id: { in: orphaned.map(s => s.id) },
        },
        data: { status: 'CANCELED' },
      });
      log.info(`Cleaned up ${orphaned.length} orphaned subscription record(s)`);
    }
  } catch (err) {
    log.error('Subscription reconciliation failed:', err);
  }
}, SUBSCRIPTION_RECONCILE_INTERVAL);

// Periodic: distribute monthly coin/gem bonuses to VIP users (runs daily at midnight UTC)
const BONUS_DISTRIBUTE_INTERVAL = 24 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const now = new Date();
    // Only distribute on the 1st of each month
    if (now.getUTCDate() !== 1) return;

    const premiumUsers = await prisma.user.findMany({
      where: {
        isPremium: true,
        premiumTier: { not: 'FREE' },
        premiumExpiresAt: { gt: now },
      },
      select: { id: true, premiumTier: true, coins: true, gems: true },
    });

    if (premiumUsers.length === 0) return;

    const { getAllTierConfigs } = await import('./modules/admin/tier-config.service');
    const configs = await getAllTierConfigs();

    let distributed = 0;
    for (const user of premiumUsers) {
      const config = configs[user.premiumTier];
      if (!config) continue;

      const updates: any = {};
      if (config.monthlyCoinBonus > 0) updates.coins = { increment: config.monthlyCoinBonus };
      if (config.monthlyGemBonus > 0) updates.gems = { increment: config.monthlyGemBonus };

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { id: user.id }, data: updates });
        distributed++;
      }
    }

    if (distributed > 0) {
      log.info(`Distributed monthly bonuses to ${distributed} VIP user(s)`);
    }
  } catch (err) {
    log.error('Monthly bonus distribution failed:', err);
  }
}, BONUS_DISTRIBUTE_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('SIGTERM received. Shutting down gracefully...');

  // Notify socket clients before disconnecting
  io.emit('server:shutting_down', {
    message: 'Server is shutting down. Please reconnect shortly.',
    timestamp: new Date().toISOString(),
  });

  // Wait briefly for clients to receive the event
  await new Promise((resolve) => setTimeout(resolve, 2000));

  httpServer.close(async () => {
    await cache.disconnect();
    await prisma.$disconnect();
    log.info('Closed');
    process.exit(0);
  });
});
