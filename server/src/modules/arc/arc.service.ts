import { Prisma, QuestStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { characterService } from '../character/character.service';

const TIER_HIERARCHY = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

type ArcWithQuests = Prisma.ArcGetPayload<{
  include: { quests: { where: { isActive: true }; orderBy: { sortOrder: 'asc' } } };
}>;

function getQuestTarget(requirements: Prisma.JsonValue) {
  const count = (requirements as { count?: number })?.count;
  return typeof count === 'number' && count > 0 ? count : 1;
}

function completionFromClaimed(totalQuests: number, claimedQuests: number) {
  return totalQuests > 0 ? Math.round((claimedQuests / totalQuests) * 100) : 0;
}

function userProgressPayload(userQuest?: {
  id: string;
  progress: number;
  maxProgress: number;
  status: QuestStatus;
  completedAt: Date | null;
  claimedAt: Date | null;
} | null) {
  if (!userQuest) return null;
  return {
    id: userQuest.id,
    progress: userQuest.progress,
    maxProgress: userQuest.maxProgress,
    status: userQuest.status,
    completed: userQuest.status === 'COMPLETED' || userQuest.status === 'CLAIMED',
    claimed: userQuest.status === 'CLAIMED',
    completedAt: userQuest.completedAt,
    claimedAt: userQuest.claimedAt,
  };
}

function questPayload(quest: ArcWithQuests['quests'][number], userQuest?: ReturnType<typeof userProgressPayload>) {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    type: quest.type,
    category: quest.category,
    requirements: quest.requirements,
    sortOrder: quest.sortOrder,
    prerequisiteQuestId: quest.prerequisiteQuestId,
    isArcFinalQuest: quest.isArcFinalQuest,
    rewardXp: quest.rewardXp,
    rewardCoins: quest.rewardCoins,
    rewardGems: quest.rewardGems,
    rewardAffection: quest.rewardAffection,
    target: getQuestTarget(quest.requirements),
    userProgress: userQuest ?? null,
  };
}

async function getActiveCharacter(userId: string) {
  return prisma.character.findFirst({
    where: { userId, isActive: true, isEnded: false, isExPersona: false },
    orderBy: { createdAt: 'desc' },
  });
}

async function emitArcCompleted(userId: string, arcId: string, arcName: string) {
  try {
    const { io } = await import('../../index');
    io.to(`user:${userId}`).emit('arc:completed', {
      arcId,
      arcName,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Socket emission is best-effort; completion is already persisted.
  }
}

export const arcService = {
  async getAllArcs(userId: string) {
    const [user, arcs, allProgress, allUserQuests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { premiumTier: true },
      }),
      prisma.arc.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        include: {
          quests: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.arcProgress.findMany({ where: { userId } }),
      prisma.userQuest.findMany({
        where: { userId },
        select: {
          id: true,
          questId: true,
          progress: true,
          maxProgress: true,
          status: true,
          completedAt: true,
          claimedAt: true,
        },
      }),
    ]);

    const progressByArcId = new Map(allProgress.map((progress) => [progress.arcId, progress]));
    const userQuestByQuestId = new Map(allUserQuests.map((quest) => [quest.questId, quest]));
    const userTier = user?.premiumTier || 'FREE';
    const userTierIndex = TIER_HIERARCHY.indexOf(userTier);

    return arcs.map((arc) => {
      const progress = progressByArcId.get(arc.id);
      const prerequisiteProgress = arc.prerequisiteArcId
        ? progressByArcId.get(arc.prerequisiteArcId)
        : null;
      const requiredTierIndex = TIER_HIERARCHY.indexOf(arc.requiredTier || 'FREE');
      const tierUnlocked = userTierIndex >= requiredTierIndex;
      const prerequisiteUnlocked = !arc.prerequisiteArcId || !!prerequisiteProgress?.completedAt;
      const totalQuests = arc.quests.length;
      const completedQuests = arc.quests.filter((quest) => {
        const userQuest = userQuestByQuestId.get(quest.id);
        return userQuest?.status === 'CLAIMED';
      }).length;

      return {
        id: arc.id,
        name: arc.name,
        description: arc.description,
        iconEmoji: arc.iconEmoji,
        minLevel: arc.minLevel,
        maxLevel: arc.maxLevel,
        requiredTier: arc.requiredTier,
        backgroundImage: arc.backgroundImage,
        orderIndex: arc.orderIndex,
        prerequisiteArcId: arc.prerequisiteArcId,
        completionPercent: progress?.completionPercent ?? completionFromClaimed(totalQuests, completedQuests),
        completedAt: progress?.completedAt,
        unlockedAt: progress?.unlockedAt,
        isUnlocked: tierUnlocked && prerequisiteUnlocked,
        lockReason: !tierUnlocked ? 'tier' : prerequisiteUnlocked ? null : 'prerequisite',
        totalQuests,
        completedQuests,
        rewards: {
          coins: arc.rewardCoins,
          gems: arc.rewardGems,
          xp: arc.rewardXp,
          affection: arc.rewardAffection,
          titleName: arc.rewardTitleName,
          sceneName: arc.rewardSceneName,
        },
        quests: arc.quests.map((quest) => questPayload(
          quest,
          userProgressPayload(userQuestByQuestId.get(quest.id))
        )),
      };
    });
  },

  async getArcDetail(userId: string, arcId: string) {
    const arc = await prisma.arc.findFirst({
      where: { id: arcId, isActive: true },
      include: {
        quests: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!arc) throw new AppError('Arc not found', 404, 'ARC_NOT_FOUND');
    await this.assertArcUnlocked(userId, arc);

    const [progress, userQuests] = await Promise.all([
      prisma.arcProgress.findUnique({ where: { userId_arcId: { userId, arcId } } }),
      prisma.userQuest.findMany({
        where: {
          userId,
          questId: { in: arc.quests.map((quest) => quest.id) },
        },
      }),
    ]);

    const userQuestByQuestId = new Map(userQuests.map((quest) => [quest.questId, quest]));
    const claimedQuests = arc.quests.filter((quest) => userQuestByQuestId.get(quest.id)?.status === 'CLAIMED').length;
    const finalQuest = arc.quests.find((quest) => quest.isArcFinalQuest) ?? arc.quests.at(-1) ?? null;

    return {
      id: arc.id,
      name: arc.name,
      description: arc.description,
      iconEmoji: arc.iconEmoji,
      minLevel: arc.minLevel,
      maxLevel: arc.maxLevel,
      requiredTier: arc.requiredTier,
      backgroundImage: arc.backgroundImage,
      orderIndex: arc.orderIndex,
      prerequisiteArcId: arc.prerequisiteArcId,
      completionPercent: progress?.completionPercent ?? completionFromClaimed(arc.quests.length, claimedQuests),
      completedAt: progress?.completedAt,
      unlockedAt: progress?.unlockedAt,
      isStarted: !!progress || userQuests.length > 0,
      totalQuests: arc.quests.length,
      completedQuests: claimedQuests,
      finalQuestId: finalQuest?.id ?? null,
      canClaimArc: !!finalQuest && userQuestByQuestId.get(finalQuest.id)?.status === 'CLAIMED' && !progress?.completedAt,
      rewards: {
        coins: arc.rewardCoins,
        gems: arc.rewardGems,
        xp: arc.rewardXp,
        affection: arc.rewardAffection,
        titleName: arc.rewardTitleName,
        sceneName: arc.rewardSceneName,
      },
      quests: arc.quests.map((quest) => questPayload(
        quest,
        userProgressPayload(userQuestByQuestId.get(quest.id))
      )),
    };
  },

  async autoStartArcQuests(userId: string, arcId: string) {
    const arc = await prisma.arc.findFirst({
      where: { id: arcId, isActive: true },
      include: { quests: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });

    if (!arc) throw new AppError('Arc not found', 404, 'ARC_NOT_FOUND');
    await this.assertArcUnlocked(userId, arc);

    await prisma.$transaction(async (tx) => {
      for (const quest of arc.quests) {
        await tx.userQuest.upsert({
          where: { userId_questId: { userId, questId: quest.id } },
          update: {},
          create: {
            userId,
            questId: quest.id,
            maxProgress: getQuestTarget(quest.requirements),
            status: 'IN_PROGRESS',
          },
        });
      }

      await tx.arcProgress.upsert({
        where: { userId_arcId: { userId, arcId } },
        update: {},
        create: { userId, arcId, completionPercent: 0 },
      });
    });

    await this.syncThresholdQuestProgress(userId);
    await this.updateArcProgress(userId, arcId);

    return this.getArcDetail(userId, arcId);
  },

  async claimArcQuestReward(userId: string, arcId: string, questId: string) {
    const arc = await prisma.arc.findFirst({
      where: { id: arcId, isActive: true },
      select: { id: true, requiredTier: true, prerequisiteArcId: true },
    });
    if (!arc) throw new AppError('Arc not found', 404, 'ARC_NOT_FOUND');
    await this.assertArcUnlocked(userId, arc);

    const quest = await prisma.quest.findFirst({
      where: { id: questId, arcId, isActive: true },
    });

    if (!quest) throw new AppError('Quest not found', 404, 'QUEST_NOT_FOUND');
    if (!quest.isArcFinalQuest) {
      throw new AppError('This arc quest is auto-claimed', 400, 'QUEST_AUTO_CLAIMED');
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.userQuest.updateMany({
        where: { userId, questId, status: 'COMPLETED' },
        data: { status: 'CLAIMED', claimedAt: new Date() },
      });

      if (updated.count === 0) {
        const userQuest = await tx.userQuest.findUnique({
          where: { userId_questId: { userId, questId } },
        });
        if (!userQuest) throw new AppError('Quest not started', 400, 'QUEST_NOT_STARTED');
        if (userQuest.status === 'CLAIMED') throw new AppError('Reward already claimed', 400, 'REWARD_ALREADY_CLAIMED');
        throw new AppError('Quest not completed', 400, 'QUEST_NOT_COMPLETED');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: quest.rewardCoins },
          gems: { increment: quest.rewardGems },
        },
      });
    });

    const character = await getActiveCharacter(userId);
    if (character) {
      if (quest.rewardXp > 0) await characterService.addExperience(character.id, quest.rewardXp, userId);
      if (quest.rewardAffection > 0) await characterService.updateAffection(character.id, quest.rewardAffection, userId);
    }

    const progress = await this.updateArcProgress(userId, arcId);

    return {
      claimed: true,
      rewards: {
        coins: quest.rewardCoins,
        gems: quest.rewardGems,
        xp: quest.rewardXp,
        affection: quest.rewardAffection,
      },
      arcProgress: progress,
    };
  },

  async claimArcCompletion(userId: string, arcId: string) {
    const arc = await prisma.arc.findFirst({
      where: { id: arcId, isActive: true },
      include: { quests: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });

    if (!arc) throw new AppError('Arc not found', 404, 'ARC_NOT_FOUND');
    await this.assertArcUnlocked(userId, arc);

    const finalQuest = arc.quests.find((quest) => quest.isArcFinalQuest) ?? arc.quests.at(-1);
    if (!finalQuest) throw new AppError('Arc has no quests', 400, 'ARC_HAS_NO_QUESTS');

    const finalQuestProgress = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId: finalQuest.id } },
    });

    const claimedQuestCount = await prisma.userQuest.count({
      where: {
        userId,
        questId: { in: arc.quests.map((quest) => quest.id) },
        status: 'CLAIMED',
      },
    });
    const refreshedFinalQuestProgress = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId: finalQuest.id } },
    });

    if (finalQuestProgress?.status === 'COMPLETED') {
      throw new AppError('Claim the final arc quest before claiming arc rewards', 400, 'ARC_FINAL_QUEST_UNCLAIMED');
    }
    if (claimedQuestCount < arc.quests.length || refreshedFinalQuestProgress?.status !== 'CLAIMED') {
      throw new AppError('Complete every arc quest before claiming arc rewards', 400, 'ARC_NOT_COMPLETED');
    }

    await this.updateArcProgress(userId, arcId);
    const character = await getActiveCharacter(userId);

    const txResult = await prisma.$transaction(async (tx) => {
      const completed = await tx.arcProgress.updateMany({
        where: { userId, arcId, completedAt: null },
        data: {
          completionPercent: 100,
          currentQuestId: finalQuest.id,
          completedAt: new Date(),
        },
      });

      if (completed.count === 0) {
        throw new AppError('Arc reward already claimed', 400, 'ARC_ALREADY_CLAIMED');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: arc.rewardCoins },
          gems: { increment: arc.rewardGems },
        },
      });

      let titleGranted = null;
      if (arc.rewardTitleName) {
        const title = await tx.title.findFirst({ where: { name: arc.rewardTitleName, isActive: true } });
        if (title) {
          await tx.userTitle.upsert({
            where: { userId_titleId: { userId, titleId: title.id } },
            create: { userId, titleId: title.id },
            update: {},
          });
          titleGranted = title;
        }
      }

      let sceneUnlocked = null;
      if (arc.rewardSceneName && character) {
        const scene = await tx.scene.findFirst({ where: { name: arc.rewardSceneName, isActive: true } });
        if (scene) {
          await tx.characterScene.upsert({
            where: { characterId_sceneId: { characterId: character.id, sceneId: scene.id } },
            create: { characterId: character.id, sceneId: scene.id },
            update: {},
          });
          sceneUnlocked = scene;
        }
      }

      const progress = await tx.arcProgress.findUnique({
        where: { userId_arcId: { userId, arcId } },
      });

      return { progress, titleGranted, sceneUnlocked };
    });

    if (character) {
      if (arc.rewardXp > 0) await characterService.addExperience(character.id, arc.rewardXp, userId);
      if (arc.rewardAffection > 0) await characterService.updateAffection(character.id, arc.rewardAffection, userId);
    }

    await emitArcCompleted(userId, arc.id, arc.name);

    return {
      claimed: true,
      progress: txResult.progress,
      rewards: {
        coins: arc.rewardCoins,
        gems: arc.rewardGems,
        xp: arc.rewardXp,
        affection: arc.rewardAffection,
        title: txResult.titleGranted,
        scene: txResult.sceneUnlocked,
      },
    };
  },

  async updateArcProgress(userId: string, arcId: string) {
    const arc = await prisma.arc.findUnique({
      where: { id: arcId },
      include: { quests: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });

    if (!arc) throw new AppError('Arc not found', 404, 'ARC_NOT_FOUND');

    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        questId: { in: arc.quests.map((quest) => quest.id) },
      },
    });
    const claimedQuestIds = new Set(
      userQuests.filter((quest) => quest.status === 'CLAIMED').map((quest) => quest.questId)
    );
    const completedQuests = arc.quests.filter((quest) => claimedQuestIds.has(quest.id)).length;
    const percent = completionFromClaimed(arc.quests.length, completedQuests);
    const currentQuest = arc.quests.find((quest) => !claimedQuestIds.has(quest.id));
    const existingProgress = await prisma.arcProgress.findUnique({
      where: { userId_arcId: { userId, arcId } },
    });

    return prisma.arcProgress.upsert({
      where: { userId_arcId: { userId, arcId } },
      create: {
        userId,
        arcId,
        completionPercent: percent,
        currentQuestId: currentQuest?.id ?? arc.quests.at(-1)?.id,
        completedAt: null,
      },
      update: {
        completionPercent: percent,
        currentQuestId: currentQuest?.id ?? arc.quests.at(-1)?.id,
        completedAt: existingProgress?.completedAt ?? null,
      },
    });
  },

  async syncThresholdQuestProgress(userId: string) {
    const character = await getActiveCharacter(userId);
    if (!character) return { updated: 0, completed: [] };

    const levelUpdates = await this.setThresholdQuestProgress(userId, 'reach_level', character.level);
    const affectionUpdates = await this.setThresholdQuestProgress(userId, 'reach_affection', character.affection);

    return {
      updated: levelUpdates.updated + affectionUpdates.updated,
      completed: [...levelUpdates.completed, ...affectionUpdates.completed],
    };
  },

  async setThresholdQuestProgress(userId: string, action: 'reach_level' | 'reach_affection', currentValue: number) {
    const completed = [];
    let updated = 0;
    const userQuests = await prisma.userQuest.findMany({
      where: { userId, status: 'IN_PROGRESS' },
      include: { quest: true },
    });
    const arcIds = Array.from(
      new Set(userQuests.map((userQuest) => userQuest.quest.arcId).filter((arcId): arcId is string => !!arcId))
    );
    const startedArcIds = arcIds.length > 0
      ? new Set(
          (await prisma.arcProgress.findMany({
            where: { userId, arcId: { in: arcIds } },
            select: { arcId: true },
          })).map((progress) => progress.arcId)
        )
      : new Set<string>();

    for (const userQuest of userQuests) {
      if (userQuest.quest.arcId && !startedArcIds.has(userQuest.quest.arcId)) continue;

      const requirements = userQuest.quest.requirements as { action?: string; count?: number };
      if (requirements.action !== action) continue;

      const maxProgress = requirements.count || userQuest.maxProgress || 1;
      const progress = Math.min(currentValue, maxProgress);
      const isCompleted = progress >= maxProgress;
      if (progress <= userQuest.progress && !isCompleted) continue;

      await prisma.userQuest.update({
        where: { id: userQuest.id },
        data: {
          progress,
          maxProgress,
          status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: isCompleted ? new Date() : null,
        },
      });

      updated++;
      if (isCompleted) {
        completed.push({
          questId: userQuest.quest.id,
          questTitle: userQuest.quest.title,
          rewards: {
            coins: userQuest.quest.rewardCoins,
            gems: userQuest.quest.rewardGems,
            xp: userQuest.quest.rewardXp,
            affection: userQuest.quest.rewardAffection,
          },
        });
      }
    }

    return { updated, completed };
  },

  async assertArcUnlocked(userId: string, arc: { requiredTier: string; prerequisiteArcId: string | null }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true },
    });
    const userTierIndex = TIER_HIERARCHY.indexOf(user?.premiumTier ?? 'FREE');
    const requiredTierIndex = TIER_HIERARCHY.indexOf(arc.requiredTier || 'FREE');
    if (userTierIndex < requiredTierIndex) {
      throw new AppError('Upgrade your tier to unlock this arc', 403, 'ARC_TIER_LOCKED');
    }

    if (!arc.prerequisiteArcId) return;

    const previousProgress = await prisma.arcProgress.findUnique({
      where: { userId_arcId: { userId, arcId: arc.prerequisiteArcId } },
      select: { completedAt: true },
    });

    if (!previousProgress?.completedAt) {
      throw new AppError('Complete the previous arc to unlock this one', 403, 'ARC_PREREQUISITE_LOCKED');
    }
  },

  async getArcProgress(userId: string) {
    const progress = await prisma.arcProgress.findMany({
      where: { userId },
      include: { arc: true },
    });

    return progress.map(p => ({
      arcId: p.arcId,
      arcName: p.arc.name,
      arcIcon: p.arc.iconEmoji,
      completionPercent: p.completionPercent,
      currentQuestId: p.currentQuestId,
      unlockedAt: p.unlockedAt,
      completedAt: p.completedAt,
    }));
  },

  async getTitles(userId: string) {
    const userTitles = await prisma.userTitle.findMany({
      where: { userId },
      include: { title: true },
      orderBy: [{ isEquipped: 'desc' }, { unlockedAt: 'desc' }],
    });

    const availableTitles = await prisma.title.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      equipped: userTitles.find(t => t.isEquipped)?.title ?? null,
      owned: userTitles.map(t => ({
        ...t.title,
        isEquipped: t.isEquipped,
        unlockedAt: t.unlockedAt,
      })),
      available: availableTitles.filter(t => !userTitles.find(ut => ut.titleId === t.id)),
    };
  },

  async equipTitle(userId: string, titleId: string) {
    await prisma.userTitle.updateMany({
      where: { userId },
      data: { isEquipped: false },
    });

    await prisma.userTitle.update({
      where: { userId_titleId: { userId, titleId } },
      data: { isEquipped: true },
    });

    return { success: true };
  },
};
