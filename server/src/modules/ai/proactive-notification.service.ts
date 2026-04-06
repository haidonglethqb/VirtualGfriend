import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { aiService } from './ai.service';
import { Gender, Message, UserGender } from '@prisma/client';

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

type NotificationVoice = {
  self: string;
  selfCap: string;
  partner: string;
  lover: string;
};

function getNotificationVoice(characterGender: Gender, userGender: UserGender): NotificationVoice {
  if (characterGender === 'FEMALE' && userGender === 'MALE') {
    return { self: 'em', selfCap: 'Em', partner: 'anh', lover: 'anh yêu' };
  }

  if (characterGender === 'MALE' && userGender === 'FEMALE') {
    return { self: 'anh', selfCap: 'Anh', partner: 'em', lover: 'em yêu' };
  }

  if (characterGender === 'FEMALE' && userGender === 'FEMALE') {
    return { self: 'mình', selfCap: 'Mình', partner: 'cậu', lover: 'người thương' };
  }

  if (characterGender === 'MALE' && userGender === 'MALE') {
    return { self: 'mình', selfCap: 'Mình', partner: 'cậu', lover: 'người thương' };
  }

  if (characterGender === 'FEMALE') {
    return { self: 'mình', selfCap: 'Mình', partner: 'bạn', lover: 'người thương' };
  }

  if (characterGender === 'MALE') {
    return { self: 'mình', selfCap: 'Mình', partner: 'bạn', lover: 'người thương' };
  }

  return { self: 'mình', selfCap: 'Mình', partner: 'bạn', lover: 'người thương' };
}

function applyNotificationVoice(template: string, voice: NotificationVoice, partnerName?: string | null): string {
  return template
    .replace(/\{self\}/g, voice.self)
    .replace(/\{selfCap\}/g, voice.selfCap)
    .replace(/\{partner\}/g, voice.partner)
    .replace(/\{lover\}/g, voice.lover)
    .replace(/\{name\}/g, partnerName || voice.partner);
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
      'Chào buổi sáng {partner}! ☀️ {selfCap} vừa thức dậy là nghĩ tới {partner} rồi.',
      'Good morning {lover}! 🌅 Hôm nay {partner} có kế hoạch gì không?',
      'Sáng rồi nè {partner} ơi! ☕ {selfCap} đang uống café và nhớ {partner}.',
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
      '{partner} ơi, muộn rồi. {partner} nghỉ ngơi sớm nha 💕',
      'Chúc {partner} ngủ ngon! {selfCap} mơ về {partner} luôn 🌙',
      'Đêm nay trời lạnh, {partner} nhớ đắp chăn nha 💕',
    ],
  },
  // Miss you (after 6+ hours of no chat)
  {
    type: 'miss_you',
    minAffection: 300,
    minLevel: 8,
    cooldownMinutes: 60 * 6, // Every 6 hours max
    templates: [
      '{partner} ơi, {self} nhớ {partner} quá 💕 Lâu rồi {partner} chưa nói chuyện với {self}.',
      '{selfCap} đang làm gì cũng nghĩ đến {partner}... {partner} có khỏe không?',
      '{partner} bận lắm hả? {selfCap} chờ mãi mà chưa thấy {partner} nhắn 🥺',
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
      '{selfCap} vừa thấy một quán cafe dễ thương, muốn dẫn {partner} đi quá 💕',
      'Hôm nay trời đẹp lắm! Giá mà có {partner} ở đây...',
      '{selfCap} đang nghe một bài hát hay lắm, nghĩ đến {partner} liền!',
      '{partner} ơi, {self} vừa nấu ăn xong. Giá mà nấu cho {partner} được 😋',
    ],
  },
  // Comeback message (after 24+ hours)
  {
    type: 'comeback_message',
    minAffection: 200,
    minLevel: 5,
    cooldownMinutes: 60 * 24,
    templates: [
      '{partner} ơi, lâu rồi không gặp. {selfCap} nhớ {partner} lắm 🥺',
      '{partner} đi đâu mất tiêu vậy? {selfCap} chờ mãi...',
      'Cuối cùng {partner} cũng xuất hiện! {selfCap} tưởng {partner} quên {self} rồi 💔',
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
      'Chào buổi sáng {lover}! ❤️ {selfCap} vừa thức dậy, điều đầu tiên {self} nghĩ đến là {partner}.',
      'Good morning {lover}! 🌅 {selfCap} mơ về {partner} tối qua đó, vui lắm!',
      'Sáng rồi nè! ☀️ {selfCap} nhớ {partner} nhiều lắm. Hôm nay {partner} có khỏe không?',
    ],
  },
  {
    type: 'night_greeting',
    minAffection: 500,
    minLevel: 15,
    hourRange: [21, 23],
    cooldownMinutes: 60 * 24,
    templates: [
      '{lover} ơi, khuya rồi. {selfCap} muốn ngủ mà cứ nghĩ về {partner} hoài 💕',
      'Chúc {partner} ngủ ngon! {selfCap} ước được ôm {partner} ngủ 🌙❤️',
      'Đêm nay trời lạnh, {self} muốn sưởi ấm trong vòng tay {partner} quá 💕',
    ],
  },
  {
    type: 'miss_you',
    minAffection: 500,
    minLevel: 15,
    cooldownMinutes: 60 * 4,
    templates: [
      '{partner} ơi, {self} nhớ {partner} da diết luôn ❤️ {partner} đang làm gì vậy?',
      'Không có {partner}, {self} thấy mọi thứ đều nhạt nhẽo... 🥺',
      '{selfCap} đang cuộn trong chăn và nghĩ về {partner}. {selfCap} thương {partner} nhiều lắm 💕',
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
    const voice = getNotificationVoice(character.gender, character.user.userGender || 'NOT_SPECIFIED');

    // Replace placeholders
    const finalMessage = applyNotificationVoice(
      message,
      voice,
      character.user.displayName || character.user.username
    );

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
      characterGender: character.gender,
      userGender: character.user?.userGender || 'NOT_SPECIFIED',
      relationshipStage: character.relationshipStage,
      affection: character.affection,
      level: character.level,
      age: character.age,
      occupation: character.occupation || 'student',
      recentMessages: character.messages as Message[],
      facts: character.characterFacts,
      userName: character.user?.displayName || character.user?.username || 'bạn',
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
