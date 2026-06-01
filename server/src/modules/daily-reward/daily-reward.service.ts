import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { getTierConfig } from '../admin/tier-config.service';

const DAILY_ACCOUNT_XP_REWARD = 30;

function getAccountXpRequiredForLevel(level: number): number {
  return 100 + (Math.max(level, 1) - 1) * 50;
}

function resolveAccountProgress(currentLevel: number, currentXp: number, gainedXp: number): { level: number; xp: number } {
  let level = Math.max(1, currentLevel);
  let xp = Math.max(0, currentXp) + Math.max(0, gainedXp);
  let xpNeeded = getAccountXpRequiredForLevel(level);

  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level += 1;
    xpNeeded = getAccountXpRequiredForLevel(level);
  }

  return { level, xp };
}

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

  getUtcDayWindow(date = new Date()) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  },

  async claimDailyReward(userId: string) {
    const now = new Date();
    const { start: todayStart, end: tomorrowStart } = this.getUtcDayWindow(now);

    // Check if already claimed today
    const cacheKey = `daily_reward:claimed:${userId}:${todayStart.toISOString().slice(0, 10)}`;
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

    // VIP bonuses
    let bonusMultiplier = 1;
    if (effectiveTier === 'BASIC') bonusMultiplier = 1.2;
    else if (effectiveTier === 'PRO') bonusMultiplier = 1.5;
    else if (effectiveTier === 'ULTIMATE') bonusMultiplier = 2;

    // Record and distribute atomically (includes anti-double-claim guard)
    const result = await prisma.$transaction(async (tx) => {
      // Serialize claims per user inside the same DB transaction to avoid race conditions.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`daily_reward:${userId}`}))`;

      const claimedToday = await tx.dailyReward.findFirst({
        where: {
          userId,
          claimedAt: { gte: todayStart, lt: tomorrowStart },
        },
        select: { id: true },
      });

      if (claimedToday) {
        throw new AppError('Đã nhận thưởng hôm nay rồi!', 400, 'ALREADY_CLAIMED');
      }

      // Calculate which day in the cycle using last claim before today
      const lastClaim = await tx.dailyReward.findFirst({
        where: { userId, claimedAt: { lt: todayStart } },
        orderBy: { claimedAt: 'desc' },
        select: { day: true, claimedAt: true },
      });

      let day = 1;
      if (lastClaim) {
        const daysSince = Math.floor((todayStart.getTime() - lastClaim.claimedAt.getTime()) / (1000 * 60 * 60 * 24));
        day = daysSince <= 1 ? Math.min(lastClaim.day + 1, 7) : 1;
      }

      const reward = this.DAILY_REWARDS[day - 1];
      const finalValue = Math.round(reward.value * bonusMultiplier);

      const accountProgress = await tx.user.findUnique({
        where: { id: userId },
        select: {
          accountLevel: true,
          accountXp: true,
        },
      });

      if (!accountProgress) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const nextAccountProgress = resolveAccountProgress(
        accountProgress.accountLevel,
        accountProgress.accountXp,
        DAILY_ACCOUNT_XP_REWARD
      );

      await tx.dailyReward.create({
        data: { userId, day, rewardType: reward.type, rewardValue: finalValue },
      });

      const updates: any = {};
      if (reward.type === 'coins') updates.coins = { increment: finalValue };
      else if (reward.type === 'gems') updates.gems = { increment: finalValue };

      updates.accountLevel = nextAccountProgress.level;
      updates.accountXp = nextAccountProgress.xp;

      if (Object.keys(updates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: updates });
      }

      return {
        day,
        rewardType: reward.type,
        value: finalValue,
        bonusMultiplier,
        accountLevel: nextAccountProgress.level,
        accountXp: nextAccountProgress.xp,
        accountXpGained: DAILY_ACCOUNT_XP_REWARD,
      };
    });

    // Cache to prevent double-claim (TTL: 24 hours)
    await cache.set(cacheKey, '1', 86400);

    return result;
  },

  async getDailyRewardStatus(userId: string) {
    const now = new Date();
    const { start: todayStart, end: tomorrowStart } = this.getUtcDayWindow(now);

    const lastClaim = await prisma.dailyReward.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
      select: { day: true, claimedAt: true },
    });

    let currentDay = 1;
    const cacheKey = `daily_reward:claimed:${userId}:${todayStart.toISOString().slice(0, 10)}`;
    let canClaim = !(await cache.get(cacheKey));

    if (canClaim) {
      const claimedToday = await prisma.dailyReward.findFirst({
        where: {
          userId,
          claimedAt: { gte: todayStart, lt: tomorrowStart },
        },
        select: { id: true },
      });

      if (claimedToday) {
        canClaim = false;
        await cache.set(cacheKey, '1', 86400);
      }
    }

    if (lastClaim) {
      const daysSince = Math.floor((todayStart.getTime() - lastClaim.claimedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 1) {
        currentDay = Math.min(lastClaim.day + 1, 7);
      }
    }

    return { currentDay, canClaim, lastClaimDay: lastClaim?.day ?? 0, rewards: this.DAILY_REWARDS };
  },
};
