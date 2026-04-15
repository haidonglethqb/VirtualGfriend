import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { getTierConfig } from '../admin/tier-config.service';

export const dailyRewardService = {
  // 7-day cycle rewards
  DAILY_REWARDS: [
    { day: 1, type: 'coins' as const, value: 50 },
    { day: 2, type: 'coins' as const, value: 100 },
    { day: 3, type: 'gems' as const, value: 5 },
    { day: 4, type: 'coins' as const, value: 150 },
    { day: 5, type: 'gems' as const, value: 10 },
    { day: 6, type: 'coins' as const, value: 200 },
    { day: 7, type: 'gems' as const, value: 25 }, // Big reward on day 7
  ],

  async claimDailyReward(userId: string) {
    // Check if already claimed today
    const cacheKey = `daily_reward:claimed:${userId}:${new Date().toDateString()}`;
    const alreadyClaimed = await cache.get(cacheKey);
    if (alreadyClaimed) {
      throw new AppError('Đã nhận thưởng hôm nay rồi!', 400, 'ALREADY_CLAIMED');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, premiumTier: true, isPremium: true, premiumExpiresAt: true },
    });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    // Check if subscription expired
    const isExpired = user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt < new Date();
    const effectiveTier = isExpired ? 'FREE' : user.premiumTier;
    const config = await getTierConfig(effectiveTier);

    // Calculate which day in the cycle
    const lastClaim = await prisma.dailyReward.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
      select: { day: true, claimedAt: true },
    });

    let day = 1;
    if (lastClaim) {
      const daysSince = Math.floor((Date.now() - lastClaim.claimedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 1) {
        // Consecutive day
        day = Math.min(lastClaim.day + 1, 7);
      } else {
        // Streak broken, reset to day 1
        day = 1;
      }
    }

    const reward = this.DAILY_REWARDS[day - 1];

    // VIP bonuses
    let bonusMultiplier = 1;
    if (effectiveTier === 'BASIC') bonusMultiplier = 1.2;
    else if (effectiveTier === 'PRO') bonusMultiplier = 1.5;
    else if (effectiveTier === 'ULTIMATE') bonusMultiplier = 2;

    const finalValue = Math.round(reward.value * bonusMultiplier);

    // Record and distribute
    await prisma.$transaction(async (tx) => {
      await tx.dailyReward.create({
        data: { userId, day, rewardType: reward.type, rewardValue: finalValue },
      });

      const updates: any = {};
      if (reward.type === 'coins') updates.coins = { increment: finalValue };
      else if (reward.type === 'gems') updates.gems = { increment: finalValue };

      if (Object.keys(updates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: updates });
      }
    });

    // Cache to prevent double-claim (TTL: 24 hours)
    await cache.set(cacheKey, '1', 86400);

    return { day, rewardType: reward.type, value: finalValue, bonusMultiplier };
  },

  async getDailyRewardStatus(userId: string) {
    const lastClaim = await prisma.dailyReward.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
      select: { day: true, claimedAt: true },
    });

    let currentDay = 1;
    let canClaim = true;
    const todayStr = new Date().toDateString();
    const cacheKey = `daily_reward:claimed:${userId}:${todayStr}`;

    if (await cache.get(cacheKey)) {
      canClaim = false;
    }

    if (lastClaim) {
      const daysSince = Math.floor((Date.now() - lastClaim.claimedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 1) {
        currentDay = Math.min(lastClaim.day + 1, 7);
      }
    }

    return { currentDay, canClaim, lastClaimDay: lastClaim?.day ?? 0, rewards: this.DAILY_REWARDS };
  },
};
