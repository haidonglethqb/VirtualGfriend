import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { router } from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { setupSocketHandlers } from './sockets';
import { prisma } from './lib/prisma';
import { createModuleLogger } from './lib/logger';

const log = createModuleLogger('Server');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

// Make io available globally
export { io };

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting (skip for Playwright tests)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // 1000 requests per minute in dev
  message: { error: 'Too many requests, please try again later.' },
  skip: (req: Request) => {
    // Skip rate limiting for Playwright E2E tests
    return req.headers['x-playwright-test'] === 'true';
  },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => {
    log.info('Closed');
    process.exit(0);
  });
});
