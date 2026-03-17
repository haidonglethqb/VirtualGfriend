import { Request, Response, NextFunction } from 'express';
import { prisma, PremiumTier } from '../lib/prisma';
import { AppError } from './error.middleware';
import { isVipTier } from '../lib/constants';
import { getTierConfig, TierConfig } from '../modules/admin/tier-config.service';
import { logger } from '../lib/logger';

// Premium tier hierarchy (higher index = more features)
const TIER_HIERARCHY: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

/**
 * Check if premium subscription has expired
 * Returns true if expired (should downgrade to FREE)
 */
function isPremiumExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false; // No expiration = lifetime
  return new Date() > expiresAt;
}

/**
 * Auto-downgrade user to FREE tier if premium expired
 * Called silently during request processing
 */
async function autoDowngradeIfExpired(userId: string, expiresAt: Date | null): Promise<boolean> {
  if (!isPremiumExpired(expiresAt)) return false;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        premiumTier: 'FREE',
        // Keep premiumExpiresAt for record
      },
    });
    logger.info(`User ${userId} premium expired - auto-downgraded to FREE`);
    return true;
  } catch (error) {
    logger.error(`Failed to auto-downgrade user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if user has premium subscription (any paid tier)
 */
export function requirePremium(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  // Check isPremium flag or premiumTier
  if (user.isPremium || (user.premiumTier && user.premiumTier !== 'FREE')) {
    return next();
  }

  return next(new AppError('Premium subscription required', 403, 'PREMIUM_REQUIRED'));
}

/**
 * Require specific premium tier or higher
 */
export function requireTier(minTier: PremiumTier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true, isPremium: true, premiumExpiresAt: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const userTier = user.premiumTier || 'FREE';
    const userTierIndex = TIER_HIERARCHY.indexOf(userTier);
    const requiredTierIndex = TIER_HIERARCHY.indexOf(minTier);

    if (userTierIndex >= requiredTierIndex) {
      return next();
    }

    // Check if premium has expired
    if (user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
      return next(new AppError(`Your premium subscription has expired. ${minTier} tier required.`, 403, 'PREMIUM_EXPIRED'));
    }

    return next(new AppError(`${minTier} subscription tier required`, 403, 'TIER_REQUIRED'));
  };
}

/**
 * Check feature access based on dynamic tier config
 */
export function requireFeature(feature: keyof TierConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true, isPremium: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const tier = (user.premiumTier || 'FREE') as PremiumTier;
    const config = await getTierConfig(tier);
    const value = config[feature];

    if (typeof value === 'boolean' && !value) {
      return next(new AppError(`Feature "${feature}" requires a premium subscription`, 403, 'FEATURE_LOCKED'));
    }
    if (typeof value === 'number' && value === 0) {
      return next(new AppError(`Feature "${feature}" requires a premium subscription`, 403, 'FEATURE_LOCKED'));
    }

    return next();
  };
}

/**
 * Add user premium info to request for conditional logic in handlers
 * Also auto-downgrades expired premium users to FREE tier
 */
export async function attachPremiumInfo(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;

  if (!userId) {
    return next();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      premiumTier: true,
      isPremium: true,
      premiumExpiresAt: true,
    },
  });

  if (user) {
    // Check and auto-downgrade if expired
    const expired = await autoDowngradeIfExpired(userId, user.premiumExpiresAt);

    // Use downgraded values if expired
    const tier = (expired ? 'FREE' : (user.premiumTier || 'FREE')) as PremiumTier;
    const isPremium = expired ? false : (user.isPremium || tier !== 'FREE');
    const features = await getTierConfig(tier);

    req.premiumInfo = {
      tier,
      isPremium,
      isVip: isVipTier(tier),
      features,
      expiresAt: user.premiumExpiresAt,
      expired,
    };
  }

  next();
}

// Extend Express Request type for premium info
declare global {
  namespace Express {
    interface Request {
      premiumInfo?: {
        tier: PremiumTier;
        isPremium: boolean;
        isVip: boolean;
        features: TierConfig;
        expiresAt: Date | null;
        expired: boolean;
      };
    }
  }
}
