import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { characterService } from '../character/character.service';
import { getTierConfig } from '../admin/tier-config.service';
import { applyCharacterRewardEffects, grantRewards } from '../reward/reward-grant.service';

function isArcQuest(quest: { arcId?: string | null; category?: string | null }) {
  return !!quest.arcId || quest.category === 'arc';
}

function assertNotArcQuest(quest: { arcId?: string | null; category?: string | null }) {
  if (isArcQuest(quest)) {
    throw new AppError(
      'Arc quests must be started and claimed through the arc journey',
      403,
      'ARC_QUEST_REQUIRES_ARC_FLOW'
    );
  }
}

function giftRewardPayload(
  rewards?: Array<{ giftId: string; quantity: number; gift?: { id: string; name: string; emoji: string; imageUrl: string; rarity: string } }>
) {
  return (rewards || []).map((reward) => ({
    giftId: reward.giftId,
    quantity: reward.quantity,
    gift: reward.gift || null,
  }));
}

function rewardSummary(quest: {
  rewardCoins: number;
  rewardGems: number;
  rewardXp: number;
  rewardAffection: number;
  giftRewards?: Array<{ quantity: number; gift?: { id: string; name: string; emoji: string; imageUrl: string; rarity: string } }>;
}) {
  return {
    coins: quest.rewardCoins,
    gems: quest.rewardGems,
    xp: quest.rewardXp,
    affection: quest.rewardAffection,
    gifts: giftRewardPayload(quest.giftRewards as any),
  };
}

export const questService = {
  async getAllQuests() {
    const allQuests = await cache.getOrSet(
      CacheKeys.quests(),
      () => prisma.quest.findMany({
        where: { isActive: true },
        include: { giftRewards: { include: { gift: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      }),
      CacheTTL.QUESTS
    );

    // Filter event quests by date
    const now = new Date();
    const filteredQuests = allQuests.filter(q => {
      if (isArcQuest(q)) return false;
      if (q.type !== 'EVENT') return true;
      if ((q as any).startsAt && now < (q as any).startsAt) return false;
      if ((q as any).endsAt && now > (q as any).endsAt) return false;
      return true;
    });

    return filteredQuests;
  },

  async getAllQuestsWithProgress(userId: string) {
    // Get quests from cache, user quests from DB (parallel)
    const [quests, userQuests] = await Promise.all([
      this.getAllQuests(),
      prisma.userQuest.findMany({ where: { userId } }),
    ]);

    const userQuestMap = new Map(userQuests.map((uq) => [uq.questId, uq]));

    return quests.map((quest) => {
      const userProgress = userQuestMap.get(quest.id);
      const requirements = quest.requirements as { count?: number; action?: string };
      return {
        ...quest,
        giftRewards: giftRewardPayload((quest as any).giftRewards),
        rewardSummary: rewardSummary(quest as any),
        userProgress: userProgress
          ? {
              id: userProgress.id,
              progress: userProgress.progress,
              maxProgress: userProgress.maxProgress,
              completed: userProgress.status === 'COMPLETED' || userProgress.status === 'CLAIMED',
              claimed: userProgress.status === 'CLAIMED',
              completedAt: userProgress.completedAt,
              claimedAt: userProgress.claimedAt,
            }
          : null,
        target: requirements.count || 1,
      };
    });
  },

  async getUserQuests(userId: string) {
    return prisma.userQuest.findMany({
      where: {
        userId,
        quest: {
          arcId: null,
          NOT: { category: 'arc' },
        },
      },
      include: { quest: true },
      orderBy: { startedAt: 'desc' },
    });
  },

  async getDailyQuests(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get daily quests
    const dailyQuests = await prisma.quest.findMany({
      where: {
        type: 'DAILY',
        isActive: true,
        arcId: null,
        NOT: { category: 'arc' },
      },
      include: { giftRewards: { include: { gift: true }, orderBy: { sortOrder: 'asc' } } },
    });

    // Get user's progress on daily quests
    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        questId: { in: dailyQuests.map((q) => q.id) },
        startedAt: { gte: today },
      },
    });

    const userQuestMap = new Map(userQuests.map((uq) => [uq.questId, uq]));

    return dailyQuests.map((quest) => {
      const userProgress = userQuestMap.get(quest.id);
      return {
        ...quest,
        giftRewards: giftRewardPayload((quest as any).giftRewards),
        rewardSummary: rewardSummary(quest as any),
        userProgress: userProgress
          ? {
              id: userProgress.id,
              progress: userProgress.progress,
              maxProgress: userProgress.maxProgress,
              completed: userProgress.status === 'COMPLETED' || userProgress.status === 'CLAIMED',
              claimed: userProgress.status === 'CLAIMED',
              completedAt: userProgress.completedAt,
              claimedAt: userProgress.claimedAt,
            }
          : null,
      };
    });
  },

  async startQuest(userId: string, questId: string) {
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
    }
    assertNotArcQuest(quest);

    // Check premium access for premium quests
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true },
    });
    const userTier = user?.premiumTier || 'FREE';
    const tierConfig = await getTierConfig(userTier);

    const TIER_HIERARCHY = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];
    if ((quest as any).requiresPremium && !tierConfig.canAccessPremiumQuests) {
      throw new AppError('Nâng cấp VIP để thực hiện nhiệm vụ này!', 403, 'PREMIUM_QUEST_REQUIRED');
    }
    if ((quest as any).minimumTier && (quest as any).minimumTier !== 'FREE') {
      const userTierIndex = TIER_HIERARCHY.indexOf(userTier);
      const requiredTierIndex = TIER_HIERARCHY.indexOf((quest as any).minimumTier);
      if (userTierIndex < requiredTierIndex) {
        throw new AppError(`Cần tier ${(quest as any).minimumTier} cho nhiệm vụ này`, 403, 'TIER_QUEST_REQUIRED');
      }
    }

    // Check if already started
    const existing = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (existing) {
      throw new AppError('Quest already started', 400, 'QUEST_ALREADY_STARTED');
    }

    const requirements = quest.requirements as { count?: number };

    return prisma.userQuest.create({
      data: {
        userId,
        questId,
        maxProgress: requirements.count || 1,
      },
      include: { quest: true },
    });
  },

  async completeQuest(userId: string, questId: string) {
    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest) {
      throw new AppError('Quest not started', 400, 'QUEST_NOT_STARTED');
    }
    assertNotArcQuest(userQuest.quest);

    if (userQuest.status !== 'IN_PROGRESS') {
      throw new AppError('Quest already completed', 400, 'QUEST_ALREADY_COMPLETED');
    }

    // Verify progress meets requirement before allowing completion
    if (userQuest.progress < userQuest.maxProgress) {
      throw new AppError(
        `Quest not completed yet. Progress: ${userQuest.progress}/${userQuest.maxProgress}`,
        400,
        'QUEST_PROGRESS_INCOMPLETE'
      );
    }

    return prisma.userQuest.update({
      where: { id: userQuest.id },
      data: {
        status: 'COMPLETED',
        progress: userQuest.maxProgress,
        completedAt: new Date(),
      },
      include: { quest: true },
    });
  },

  async claimReward(userId: string, questId: string) {
    const questForAccess = await prisma.quest.findUnique({
      where: { id: questId },
      select: { arcId: true, category: true },
    });

    if (!questForAccess) {
      throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
    }
    assertNotArcQuest(questForAccess);

    const { quest, grantResult } = await prisma.$transaction(async (tx) => {
      const updated = await tx.userQuest.updateMany({
        where: { userId, questId, status: 'COMPLETED' },
        data: { status: 'CLAIMED', claimedAt: new Date() },
      });

      if (updated.count === 0) {
        const userQuest = await tx.userQuest.findFirst({
          where: { userId, questId },
          include: { quest: true },
        });

        if (!userQuest) {
          throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
        }
        assertNotArcQuest(userQuest.quest);
        if (userQuest.status === 'CLAIMED') {
          throw new AppError('Reward already claimed', 400, 'REWARD_ALREADY_CLAIMED');
        }
        throw new AppError('Quest not completed', 400, 'QUEST_NOT_COMPLETED');
      }

      const userQuest = await tx.userQuest.findFirst({
        where: { userId, questId },
        include: {
          quest: {
            include: {
              giftRewards: { include: { gift: true }, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });

      if (!userQuest) {
        throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
      }
      assertNotArcQuest(userQuest.quest);

      const quest = userQuest.quest;
      const grantResult = await grantRewards({
        userId,
        coins: quest.rewardCoins,
        gems: quest.rewardGems,
        xp: quest.rewardXp,
        affection: quest.rewardAffection,
        gifts: giftRewardPayload(quest.giftRewards),
        source: 'QUEST_REWARD',
        sourceRefId: quest.id,
        notificationTitle: 'Phan thuong nhiem vu',
        message: `Ban da nhan thuong tu nhiem vu "${quest.title}".`,
      }, tx);

      return { quest, grantResult };
    });

    await applyCharacterRewardEffects(userId, grantResult);

    return {
      claimed: true,
      rewards: {
        coins: quest.rewardCoins,
        gems: quest.rewardGems,
        xp: quest.rewardXp,
        affection: quest.rewardAffection,
        items: quest.rewardItems,
        gifts: giftRewardPayload(quest.giftRewards),
        rewardSummary: rewardSummary(quest),
      },
    };

/*
    {
    // Atomic update: only transition COMPLETED -> CLAIMED
    const updated = await prisma.userQuest.updateMany({
      where: { userId, questId, status: 'COMPLETED' },
      data: { status: 'CLAIMED', claimedAt: new Date() },
    });

    if (updated.count === 0) {
      // Either quest doesn't exist or already claimed — determine which
      const userQuest = await prisma.userQuest.findFirst({
        where: { userId, questId },
        include: { quest: true },
      });

      if (!userQuest) {
        throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
      }
      assertNotArcQuest(userQuest.quest);
      if (userQuest.status === 'CLAIMED') {
        throw new AppError('Reward already claimed', 400, 'REWARD_ALREADY_CLAIMED');
      }
      throw new AppError('Quest not completed', 400, 'QUEST_NOT_COMPLETED');
    }

    const userQuest = await prisma.userQuest.findFirst({
      where: { userId, questId },
      include: { quest: true },
    });

    if (!userQuest) {
      throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
    }
    assertNotArcQuest(userQuest.quest);

    const quest = userQuest.quest;

    // Give currency rewards
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: quest.rewardCoins },
        gems: { increment: quest.rewardGems },
      },
    });

    // Update character XP/affection (outside transaction as these are non-critical)
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (character) {
      if (quest.rewardXp > 0) {
        await characterService.addExperience(character.id, quest.rewardXp);
      }
      if (quest.rewardAffection > 0) {
        await characterService.updateAffection(character.id, quest.rewardAffection, userId);
      }
    }

    return {
      claimed: true,
      rewards: {
        coins: quest.rewardCoins,
        gems: quest.rewardGems,
        xp: quest.rewardXp,
        affection: quest.rewardAffection,
        items: quest.rewardItems,
      },
    };
    }
*/
  },

  async updateQuestProgress(userId: string, action: string, increment: number = 1) {
    // Find all in-progress quests matching this action (single query)
    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    // Collect updates for matching quests
    const updates = userQuests
      .filter((uq) => {
        const requirements = uq.quest.requirements as { action?: string; count?: number };
        return requirements.action === action;
      })
      .map((uq) => {
        const newProgress = Math.min(uq.progress + increment, uq.maxProgress);
        return prisma.userQuest.update({
          where: { id: uq.id },
          data: {
            progress: newProgress,
            status: newProgress >= uq.maxProgress ? 'COMPLETED' : 'IN_PROGRESS',
            completedAt: newProgress >= uq.maxProgress ? new Date() : null,
          },
        });
      });

    // Batch execute all updates in a single transaction
    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
  },

  /**
   * Auto-start weekly quests for the user at the beginning of each week
   * Optimized: batch queries instead of per-quest DB calls
   */
  async autoStartWeeklyQuests(userId: string): Promise<void> {
    const cacheKey = `weekly_quest_reset:${userId}`;
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${this.getWeekNumber(now)}`;

    const alreadyReset = await cache.get(`${cacheKey}:${weekKey}`);
    if (alreadyReset) return;

    // Get all active weekly quests
    const weeklyQuests = await prisma.quest.findMany({
      where: {
        type: 'WEEKLY',
        isActive: true,
        arcId: null,
        NOT: { category: 'arc' },
      },
    });

    if (weeklyQuests.length === 0) {
      await cache.set(`${cacheKey}:${weekKey}`, '1', 604800); // 7 days
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const quest of weeklyQuests) {
        const existing = await tx.userQuest.findUnique({
          where: { userId_questId: { userId, questId: quest.id } },
        });

        if (existing) {
          // Reset progress
          await tx.userQuest.update({
            where: { id: existing.id },
            data: { progress: 0, status: 'IN_PROGRESS', startedAt: new Date() },
          });
        } else {
          // Create new
          const requirements = quest.requirements as { count?: number };
          await tx.userQuest.create({
            data: {
              userId,
              questId: quest.id,
              maxProgress: requirements.count ?? 1,
            },
          });
        }
      }
    });

    await cache.set(`${cacheKey}:${weekKey}`, '1', 604800); // 7 days
  },

  /**
   * Get ISO week number for a date
   */
  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  },
};
