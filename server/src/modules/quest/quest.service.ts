import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { characterService } from '../character/character.service';

export const questService = {
  async getAllQuests() {
    return cache.getOrSet(
      CacheKeys.quests(),
      () => prisma.quest.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      }),
      CacheTTL.QUESTS
    );
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
      where: { userId },
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
      },
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

    return dailyQuests.map((quest) => ({
      ...quest,
      userProgress: userQuestMap.get(quest.id) || null,
    }));
  },

  async startQuest(userId: string, questId: string) {
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
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
    });

    if (!userQuest) {
      throw new AppError('Quest not started', 400, 'QUEST_NOT_STARTED');
    }

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
    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest) {
      throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
    }

    if (userQuest.status !== 'COMPLETED') {
      throw new AppError('Quest not completed', 400, 'QUEST_NOT_COMPLETED');
    }

    const quest = userQuest.quest;

    // Use transaction to ensure atomicity of claim + reward
    await prisma.$transaction([
      // Update user quest to claimed
      prisma.userQuest.update({
        where: { id: userQuest.id },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
        },
      }),
      // Give currency rewards
      prisma.user.update({
        where: { id: userId },
        data: {
          coins: { increment: quest.rewardCoins },
          gems: { increment: quest.rewardGems },
        },
      }),
    ]);

    // Update character XP/affection (outside transaction as these are non-critical)
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (character) {
      if (quest.rewardXp > 0) {
        await characterService.addExperience(character.id, quest.rewardXp);
      }
      if (quest.rewardAffection > 0) {
        await characterService.updateAffection(character.id, quest.rewardAffection);
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
};
