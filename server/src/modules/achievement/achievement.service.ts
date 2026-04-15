import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';

export const achievementService = {
  async getAllAchievements(userId: string, category?: string) {
    const where: any = {};
    if (category) where.category = category;

    const achievements = await prisma.achievement.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }],
      include: {
        userAchievements: { where: { userId } },
      },
    });

    return achievements.map(a => ({
      ...a,
      unlocked: a.userAchievements.length > 0 && !!a.userAchievements[0].unlockedAt,
      claimed: a.userAchievements.length > 0 && !!a.userAchievements[0].claimedAt,
      progress: a.userAchievements.length > 0 ? a.userAchievements[0].progress : 0,
      unlockedAt: a.userAchievements.length > 0 ? a.userAchievements[0].unlockedAt : null,
    }));
  },

  async checkAndUpdateAchievements(userId: string) {
    const achievements = await prisma.achievement.findMany({});
    const unlocked: string[] = [];

    for (const achievement of achievements) {
      const existing = await prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
      });

      if (existing?.unlockedAt) continue; // Already unlocked

      const progress = await this.calculateProgress(userId, achievement);
      const req = achievement.requirement as any;

      if (progress >= req.count && !existing) {
        // First time unlock
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress,
            unlockedAt: new Date(),
          },
        });
        unlocked.push(achievement.name);

        // Give rewards
        if (achievement.rewardXp > 0 || achievement.rewardCoins > 0 || achievement.rewardGems > 0) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              ...(achievement.rewardCoins > 0 && { coins: { increment: achievement.rewardCoins } }),
              ...(achievement.rewardGems > 0 && { gems: { increment: achievement.rewardGems } }),
            },
          });
        }
      } else if (existing) {
        // Update progress
        if (existing.progress !== progress) {
          await prisma.userAchievement.update({
            where: { id: existing.id },
            data: { progress },
          });
        }
      }
    }

    return unlocked;
  },

  async calculateProgress(userId: string, achievement: any): Promise<number> {
    const req = achievement.requirement as any;
    switch (req.action) {
      case 'total_messages': {
        const count = await prisma.message.count({ where: { userId } });
        return count;
      }
      case 'total_gifts': {
        const count = await prisma.giftHistory.count({ where: { userId } });
        return count;
      }
      case 'streak': {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
        return user?.streak ?? 0;
      }
      case 'reach_affection': {
        const chars = await prisma.character.findMany({ where: { userId }, select: { affection: true } });
        return Math.max(...chars.map(c => c.affection), 0);
      }
      case 'romantic_messages': {
        const count = await prisma.message.count({ where: { userId, emotion: 'romantic' } });
        return count;
      }
      case 'arc_complete': {
        const arcProgress = await prisma.arcProgress.findFirst({
          where: { userId, arcId: req.arcId, completedAt: { not: null } },
        });
        return arcProgress ? 1 : 0;
      }
      case 'achievement_points': {
        const earned = await prisma.userAchievement.findMany({
          where: { userId, unlockedAt: { not: null } },
          include: { achievement: { select: { points: true } } },
        });
        return earned.reduce((sum, ua) => sum + ua.achievement.points, 0);
      }
      default:
        return 0;
    }
  },

  async claimAchievement(userId: string, achievementId: string) {
    const userAchievement = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
      include: { achievement: true },
    });

    if (!userAchievement) throw new AppError('Achievement not found', 404, 'NOT_FOUND');
    if (!userAchievement.unlockedAt) throw new AppError('Achievement not yet unlocked', 400, 'NOT_UNLOCKED');
    if (userAchievement.claimedAt) throw new AppError('Already claimed', 400, 'ALREADY_CLAIMED');

    await prisma.userAchievement.update({
      where: { id: userAchievement.id },
      data: { claimedAt: new Date() },
    });

    return { success: true };
  },

  async getAchievementPoints(userId: string): Promise<number> {
    const earned = await prisma.userAchievement.findMany({
      where: { userId, unlockedAt: { not: null } },
      include: { achievement: { select: { points: true } } },
    });
    return earned.reduce((sum, ua) => sum + ua.achievement.points, 0);
  },
};
