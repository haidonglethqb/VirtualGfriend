/**
 * Request ID Middleware
 * Adds a unique request ID to each incoming request for tracing/observability.
 * The ID is available as req.requestId and returned in X-Request-Id header.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientId = req.headers['x-request-id'] as string;
  // Only accept client-supplied request ID if it's a valid UUID to prevent log injection
  const requestId = (clientId && UUID_REGEX.test(clientId)) ? clientId : uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
