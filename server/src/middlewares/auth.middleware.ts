import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, PremiumTier } from '../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../lib/redis';
import { AppError } from './error.middleware';

interface JwtPayload {
  userId: string;
  email: string;
}

interface CachedUser {
  id: string;
  email: string;
  isPremium: boolean;
  premiumTier: PremiumTier;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isPremium: boolean;
        premiumTier: PremiumTier;
      };
    }
  }
}

/**
 * Fetch user from cache or DB (cache-aside pattern)
 */
async function getUserFromCacheOrDb(userId: string): Promise<CachedUser | null> {
  // Try cache first
  const cacheKey = CacheKeys.userAuth(userId);
  const cached = await cache.get<CachedUser>(cacheKey);
  if (cached) return cached;

  // Cache miss — query DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPremium: true, premiumTier: true },
  });

  // Store in cache (TTL = access token lifetime)
  if (user) {
    await cache.set(cacheKey, { ...user, premiumTier: user.premiumTier || 'FREE' }, CacheTTL.USER_AUTH);
  }

  return user ? { ...user, premiumTier: user.premiumTier || 'FREE' } : null;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
      { algorithms: ['HS256'] }
    ) as JwtPayload;

    const user = await getUserFromCacheOrDb(decoded.userId);

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(new AppError('Authentication failed', 401, 'AUTH_FAILED'));
    }
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
      { algorithms: ['HS256'] }
    ) as JwtPayload;

    const user = await getUserFromCacheOrDb(decoded.userId);

    if (user) {
      req.user = user;
    }
    
    next();
  } catch {
    next();
  }
};
