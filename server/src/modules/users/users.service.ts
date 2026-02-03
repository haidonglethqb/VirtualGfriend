import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

interface UpdateProfileData {
  username?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
}

interface UpdateSettingsData {
  language?: string;
  theme?: 'dark' | 'light' | 'auto';
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  musicEnabled?: boolean;
  autoPlayVoice?: boolean;
  chatBubbleStyle?: string;
  fontSize?: 'small' | 'medium' | 'large';
  notifications?: boolean;
}

interface UpdatePrivacyData {
  profilePublic?: boolean;
  showActivity?: boolean;
  allowMessages?: boolean;
}

export const userService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        isPremium: true,
        premiumExpiresAt: true,
        coins: true,
        gems: true,
        streak: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileData) {
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new AppError('Username already taken', 400, 'USERNAME_EXISTS');
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
      },
    });
  },

  async getSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  },

  async updateSettings(userId: string, data: UpdateSettingsData) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  },

  async getStats(userId: string) {
    const [
      totalMessages,
      totalQuests,
      completedQuests,
      totalGiftsSent,
      character,
    ] = await Promise.all([
      prisma.message.count({ where: { userId } }),
      prisma.userQuest.count({ where: { userId } }),
      prisma.userQuest.count({ where: { userId, status: 'CLAIMED' } }),
      prisma.giftHistory.count({
        where: { character: { userId } },
      }),
      prisma.character.findFirst({
        where: { userId, isActive: true },
        select: {
          level: true,
          affection: true,
          relationshipStage: true,
        },
      }),
    ]);

    return {
      totalMessages,
      totalQuests,
      completedQuests,
      totalGiftsSent,
      characterLevel: character?.level || 1,
      affectionLevel: character?.affection || 0,
      relationshipStage: character?.relationshipStage || 'STRANGER',
    };
  },

  async getNotifications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: notifications,
      total,
      page,
      pageSize: limit,
      hasMore: skip + notifications.length < total,
    };
  },

  async markNotificationsRead(userId: string, ids?: string[]) {
    if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { userId, id: { in: ids } },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: true },
      });
    }
  },

  async getPrivacySettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        profilePublic: true,
        showActivity: true,
        allowMessages: true,
      },
    });

    if (!settings) {
      const created = await prisma.userSettings.create({
        data: { userId },
      });
      settings = {
        profilePublic: created.profilePublic ?? false,
        showActivity: created.showActivity ?? false,
        allowMessages: created.allowMessages ?? true,
      };
    }

    return settings;
  },

  async updatePrivacySettings(userId: string, data: UpdatePrivacyData) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      select: {
        profilePublic: true,
        showActivity: true,
        allowMessages: true,
      },
    });
  },
};
