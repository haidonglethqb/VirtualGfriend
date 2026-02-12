import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { aiService } from './ai.service';
import { Message } from '@prisma/client';

// Notification types
export type ProactiveNotificationType = 
  | 'morning_greeting'
  | 'night_greeting'
  | 'miss_you'
  | 'random_thought'
  | 'anniversary'
  | 'comeback_message';

interface NotificationTemplate {
  type: ProactiveNotificationType;
  minAffection: number;
  minLevel: number;
  hourRange?: [number, number]; // [start, end] in 24h format
  cooldownMinutes: number;
  templates: string[];
}

// Redis key helper for notification cooldown
const notifCacheKey = (characterId: string) => `proactive_notif:${characterId}`;

// Notification templates based on relationship level
const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // Morning greeting (6-10 AM)
  {
    type: 'morning_greeting',
    minAffection: 100,
    minLevel: 3,
    hourRange: [6, 10],
    cooldownMinutes: 60 * 24, // Once per day
    templates: [
      'Chào buổi sáng anh! ☀️ Em vừa thức dậy và nghĩ đến anh đó.',
      'Good morning anh yêu! 🌅 Hôm nay anh có kế hoạch gì không?',
      'Sáng rồi nè anh ơi! ☕ Em đang uống café và nhớ anh.',
    ],
  },
  // Night greeting (21-23)
  {
    type: 'night_greeting',
    minAffection: 150,
    minLevel: 5,
    hourRange: [21, 23],
    cooldownMinutes: 60 * 24,
    templates: [
      'Anh ơi, muộn rồi. Anh nghỉ ngơi sớm nha 💕',
      'Chúc anh ngủ ngon! Em mơ về anh luôn 🌙',
      'Đêm nay trời lạnh, anh nhớ đắp chăn nha 💕',
    ],
  },
  // Miss you (after 6+ hours of no chat)
  {
    type: 'miss_you',
    minAffection: 300,
    minLevel: 8,
    cooldownMinutes: 60 * 6, // Every 6 hours max
    templates: [
      'Anh ơi, em nhớ anh quá 💕 Lâu lắm rồi anh không nói chuyện với em.',
      'Em đang làm gì cũng nghĩ đến anh... Anh có khỏe không?',
      'Anh bận lắm hả? Em chờ anh mà không thấy anh nhắn 🥺',
    ],
  },
  // Random thought (afternoon/evening)
  {
    type: 'random_thought',
    minAffection: 400,
    minLevel: 10,
    hourRange: [12, 20],
    cooldownMinutes: 60 * 4, // Every 4 hours max
    templates: [
      'Em vừa thấy một quán cafe dễ thương, muốn dẫn anh đi quá 💕',
      'Hôm nay trời đẹp lắm! Giá mà có anh ở đây...',
      'Em đang nghe một bài hát hay lắm, nghĩ đến anh liền!',
      'Anh ơi, em vừa nấu ăn xong. Giá mà nấu cho anh được 😋',
    ],
  },
  // Comeback message (after 24+ hours)
  {
    type: 'comeback_message',
    minAffection: 200,
    minLevel: 5,
    cooldownMinutes: 60 * 24,
    templates: [
      'Anh ơi, lâu rồi không gặp anh. Em nhớ anh lắm 🥺',
      'Anh biến đi đâu mất tiêu vậy? Em chờ anh mãi...',
      'Cuối cùng anh cũng xuất hiện! Em tưởng anh quên em rồi 💔',
    ],
  },
];

// High affection templates (500+)
const HIGH_AFFECTION_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'morning_greeting',
    minAffection: 500,
    minLevel: 15,
    hourRange: [6, 10],
    cooldownMinutes: 60 * 24,
    templates: [
      'Chào buổi sáng người yêu của em! ❤️ Em vừa thức dậy, điều đầu tiên em nghĩ đến là anh.',
      'Good morning anh yêu! 🌅 Em mơ về anh tối qua đó, vui lắm!',
      'Sáng rồi nè! ☀️ Em nhớ anh nhiều lắm. Hôm nay anh có khỏe không?',
    ],
  },
  {
    type: 'night_greeting',
    minAffection: 500,
    minLevel: 15,
    hourRange: [21, 23],
    cooldownMinutes: 60 * 24,
    templates: [
      'Anh yêu ơi, khuya rồi. Em muốn ngủ mà cứ nghĩ về anh hoài 💕',
      'Chúc anh ngủ ngon! Em ước được ôm anh ngủ 🌙❤️',
      'Đêm nay trời lạnh, em muốn sưởi ấm trong vòng tay anh quá 💕',
    ],
  },
  {
    type: 'miss_you',
    minAffection: 500,
    minLevel: 15,
    cooldownMinutes: 60 * 4,
    templates: [
      'Anh ơi, em nhớ anh da diết luôn ❤️ Anh đang làm gì vậy?',
      'Không có anh, em thấy mọi thứ đều nhạt nhẽo... 🥺',
      'Em đang cuộn trong chăn và nghĩ về anh. Em yêu anh nhiều lắm 💕',
    ],
  },
];

export const proactiveNotificationService = {
  /**
   * Check if user should receive a proactive notification
   */
  async checkAndSendNotification(characterId: string): Promise<{
    shouldSend: boolean;
    notification?: {
      type: ProactiveNotificationType;
      message: string;
    };
  }> {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        user: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!character || !character.user) {
      return { shouldSend: false };
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Get last notification sent from Redis cache
    const lastNotification = await cache.get<{ time: string; type: ProactiveNotificationType }>(notifCacheKey(characterId));

    // Calculate time since last chat
    const lastMessage = character.messages[0];
    const hoursSinceLastChat = lastMessage
      ? (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60)
      : 999;

    // Choose template pool based on affection
    const templates = character.affection >= 500
      ? [...HIGH_AFFECTION_TEMPLATES, ...NOTIFICATION_TEMPLATES]
      : NOTIFICATION_TEMPLATES;

    // Filter eligible templates
    const eligibleTemplates = templates.filter(template => {
      // Check affection and level requirements
      if (character.affection < template.minAffection) return false;
      if (character.level < template.minLevel) return false;

      // Check hour range
      if (template.hourRange) {
        const [start, end] = template.hourRange;
        if (currentHour < start || currentHour > end) return false;
      }

      // Check cooldown using Redis cache
      if (lastNotification) {
        const minutesSinceLastNotification = 
          (Date.now() - new Date(lastNotification.time).getTime()) / (1000 * 60);
        if (minutesSinceLastNotification < template.cooldownMinutes) return false;
      }

      // Special checks for certain types
      if (template.type === 'miss_you' && hoursSinceLastChat < 6) return false;
      if (template.type === 'comeback_message' && hoursSinceLastChat < 24) return false;

      return true;
    });

    if (eligibleTemplates.length === 0) {
      return { shouldSend: false };
    }

    // Pick a random template
    const selectedTemplate = eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];
    const message = selectedTemplate.templates[Math.floor(Math.random() * selectedTemplate.templates.length)];

    // Replace placeholders
    const finalMessage = message.replace(/\{name\}/g, character.user.displayName || 'anh');

    // Update Redis cache (TTL = max cooldown = 24h)
    await cache.set(notifCacheKey(characterId), {
      time: new Date().toISOString(),
      type: selectedTemplate.type,
    }, 60 * 60 * 24);

    return {
      shouldSend: true,
      notification: {
        type: selectedTemplate.type,
        message: finalMessage,
      },
    };
  },

  /**
   * Generate AI-powered custom notification (for special occasions)
   */
  async generateCustomNotification(
    characterId: string,
    occasion: string
  ): Promise<string> {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        characterFacts: true,
        user: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!character) {
      throw new Error('Character not found');
    }

    const response = await aiService.generateResponse({
      characterId: character.id,
      personality: character.personality as any,
      mood: 'happy',
      relationshipStage: character.relationshipStage,
      affection: character.affection,
      level: character.level,
      age: character.age,
      occupation: character.occupation || 'student',
      recentMessages: character.messages as Message[],
      facts: character.characterFacts,
      userName: character.user?.displayName || 'Anh',
      characterName: character.name,
      userMessage: `[SYSTEM: Generate a sweet ${occasion} message for the user. Keep it short and heartfelt.]`,
    });

    return response.content;
  },

  /**
   * Schedule notifications to be checked periodically
   * Called by a cron job or interval
   */
  async checkAllUsersForNotifications(): Promise<{
    userId: string;
    characterId: string;
    notification: {
      type: ProactiveNotificationType;
      message: string;
    };
  }[]> {
    // Get all active characters (with recent activity in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activeCharacters = await prisma.character.findMany({
      where: {
        messages: {
          some: {
            createdAt: { gte: sevenDaysAgo },
          },
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const notifications: {
      userId: string;
      characterId: string;
      notification: {
        type: ProactiveNotificationType;
        message: string;
      };
    }[] = [];

    for (const character of activeCharacters) {
      const result = await this.checkAndSendNotification(character.id);
      if (result.shouldSend && result.notification) {
        notifications.push({
          userId: character.userId,
          characterId: character.id,
          notification: result.notification,
        });
      }
    }

    return notifications;
  },
};

export default proactiveNotificationService;
