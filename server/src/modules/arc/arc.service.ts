import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';

export const arcService = {
  async getAllArcs(userId: string) {
    const arcs = await prisma.arc.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        arcProgress: { where: { userId } },
        quests: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return arcs.map(arc => {
      const progress = arc.arcProgress[0];
      const totalQuests = arc.quests.length;
      const isUnlocked = arc.requiredTier === 'FREE' || true; // Check against user tier

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
        completionPercent: progress?.completionPercent ?? 0,
        completedAt: progress?.completedAt,
        unlockedAt: progress?.unlockedAt,
        isUnlocked,
        totalQuests,
        quests: arc.quests.map(q => ({
          id: q.id,
          title: q.title,
          description: q.description,
          type: q.type,
          sortOrder: q.sortOrder,
          prerequisiteQuestId: q.prerequisiteQuestId,
        })),
      };
    });
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

  async updateArcProgress(userId: string, arcId: string) {
    const arc = await prisma.arc.findUnique({
      where: { id: arcId },
      include: { quests: { where: { isActive: true } } },
    });

    if (!arc) throw new AppError('Arc not found', 404, 'ARC_NOT_FOUND');

    // Calculate progress based on quest completion
    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        questId: { in: arc.quests.map(q => q.id) },
        status: 'CLAIMED',
      },
    });

    const totalQuests = arc.quests.length;
    const completedQuests = userQuests.length;
    const percent = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

    // Upsert progress
    const progress = await prisma.arcProgress.upsert({
      where: { userId_arcId: { userId, arcId } },
      create: {
        userId,
        arcId,
        completionPercent: percent,
        completedAt: percent >= 100 ? new Date() : null,
      },
      update: {
        completionPercent: percent,
        ...(percent >= 100 && { completedAt: new Date() }),
      },
    });

    // Check if arc completed - award title
    if (percent >= 100) {
      const title = await prisma.title.findFirst({
        where: {
          requirement: {
            path: ['type'],
            equals: 'arc_complete',
          },
        },
      });

      // Filter by arcId manually since Prisma JSON path queries are limited
      const matchingTitle = title && ((title.requirement as any).arcId === arcId) ? title : null;

      if (matchingTitle) {
        await prisma.userTitle.upsert({
          where: { userId_titleId: { userId, titleId: matchingTitle.id } },
          create: { userId, titleId: matchingTitle.id },
          update: {},
        });
      }
    }

    return progress;
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
    // Unequip all first
    await prisma.userTitle.updateMany({
      where: { userId },
      data: { isEquipped: false },
    });

    // Equip the new one
    await prisma.userTitle.update({
      where: { userId_titleId: { userId, titleId } },
      data: { isEquipped: true },
    });

    return { success: true };
  },
};
