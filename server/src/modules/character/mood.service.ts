import { prisma } from '../../lib/prisma';

// Mood levels và thresholds
export type MoodLevel = 'very_sad' | 'sad' | 'neutral' | 'happy' | 'very_happy' | 'excited';

interface MoodFactors {
  timeSinceLastChat: number; // minutes
  giftsToday: number;
  messagesExchanged: number;
  affectionLevel: number;
  relationshipStage: string;
}

interface MoodResult {
  mood: MoodLevel;
  moodScore: number; // 0-100
  moodEmoji: string;
  description: string;
  factors: string[];
}

const MOOD_EMOJIS: Record<MoodLevel, string> = {
  very_sad: '',
  sad: '',
  neutral: '',
  happy: '',
  very_happy: '',
  excited: '',
};

const MOOD_DESCRIPTIONS: Record<MoodLevel, string[]> = {
  very_sad: [
    'Cô ấy rất buồn và nhớ bạn nhiều lắm...',
    'Cô ấy đang cảm thấy cô đơn...',
  ],
  sad: [
    'Cô ấy hơi buồn vì không gặp bạn lâu rồi.',
    'Cô ấy đang suy nghĩ về bạn.',
  ],
  neutral: [
    'Cô ấy bình thường.',
    'Cô ấy đang chờ đợi gì đó...',
  ],
  happy: [
    'Cô ấy đang vui vẻ!',
    'Cô ấy thấy hôm nay thật tuyệt!',
  ],
  very_happy: [
    'Cô ấy rất vui khi có bạn!',
    'Cô ấy đang rất hạnh phúc!',
  ],
  excited: [
    'Cô ấy siêu hào hứng khi gặp bạn!',
    'Trái tim cô ấy đang đập thình thịch!',
  ],
};

export const moodService = {
  /**
   * Tính toán mood dựa trên các factors
   */
  calculateMood(factors: MoodFactors): MoodResult {
    let moodScore = 50; // Bắt đầu từ neutral
    const moodFactors: string[] = [];

    // Time since last chat ảnh hưởng
    if (factors.timeSinceLastChat < 60) {
      // Dưới 1 tiếng
      moodScore += 15;
      moodFactors.push('Mới chat gần đây');
    } else if (factors.timeSinceLastChat < 180) {
      // 1-3 tiếng
      moodScore += 5;
    } else if (factors.timeSinceLastChat < 360) {
      // 3-6 tiếng
      moodScore -= 5;
    } else if (factors.timeSinceLastChat < 720) {
      // 6-12 tiếng
      moodScore -= 10;
      moodFactors.push('Không gặp đã lâu');
    } else if (factors.timeSinceLastChat < 1440) {
      // 12-24 tiếng
      moodScore -= 20;
      moodFactors.push('Nhớ bạn lắm');
    } else {
      // Hơn 1 ngày
      moodScore -= 30;
      moodFactors.push('Rất nhớ bạn');
    }

    // Gifts received today
    if (factors.giftsToday >= 3) {
      moodScore += 20;
      moodFactors.push('Nhận được nhiều quà');
    } else if (factors.giftsToday >= 1) {
      moodScore += 10;
      moodFactors.push('Được tặng quà');
    }

    // Messages exchanged today
    if (factors.messagesExchanged >= 50) {
      moodScore += 15;
      moodFactors.push('Nói chuyện rất nhiều');
    } else if (factors.messagesExchanged >= 20) {
      moodScore += 10;
      moodFactors.push('Nói chuyện nhiều');
    } else if (factors.messagesExchanged >= 5) {
      moodScore += 5;
    }

    // Affection level bonus
    if (factors.affectionLevel >= 500) {
      moodScore += 10;
    } else if (factors.affectionLevel >= 200) {
      moodScore += 5;
    }

    // Relationship stage bonus
    if (factors.relationshipStage === 'LOVER') {
      moodScore += 10;
    } else if (factors.relationshipStage === 'DATING') {
      moodScore += 5;
    }

    // Clamp score
    moodScore = Math.max(0, Math.min(100, moodScore));

    // Determine mood level
    let mood: MoodLevel;
    if (moodScore < 20) {
      mood = 'very_sad';
    } else if (moodScore < 35) {
      mood = 'sad';
    } else if (moodScore < 55) {
      mood = 'neutral';
    } else if (moodScore < 75) {
      mood = 'happy';
    } else if (moodScore < 90) {
      mood = 'very_happy';
    } else {
      mood = 'excited';
    }

    const descriptions = MOOD_DESCRIPTIONS[mood];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    return {
      mood,
      moodScore,
      moodEmoji: MOOD_EMOJIS[mood],
      description,
      factors: moodFactors,
    };
  },

  /**
   * Lấy mood hiện tại của character
   */
  async getCurrentMood(characterId: string): Promise<MoodResult> {
    // Get character data
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!character) {
      throw new Error('Character not found');
    }

    // Calculate time since last chat
    const lastMessage = character.messages[0];
    const timeSinceLastChat = lastMessage
      ? Math.floor((Date.now() - lastMessage.createdAt.getTime()) / 60000)
      : 999999;

    // Count messages today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const messagesExchanged = await prisma.message.count({
      where: {
        characterId,
        createdAt: { gte: todayStart },
      },
    });

    // Count gifts today (from gift history)
    const giftsToday = await prisma.giftHistory.count({
      where: {
        userId: character.userId,
        characterId,
        createdAt: { gte: todayStart },
      },
    });

    return this.calculateMood({
      timeSinceLastChat,
      giftsToday,
      messagesExchanged,
      affectionLevel: character.affection,
      relationshipStage: character.relationshipStage,
    });
  },

  /**
   * Lấy mood modifier cho AI prompt
   */
  getMoodModifier(mood: MoodLevel): string {
    switch (mood) {
      case 'very_sad':
        return 'Cô ấy đang rất buồn và tủi thân. Giọng điệu nên buồn bã, có thể hờn dỗi nhẹ.';
      case 'sad':
        return 'Cô ấy đang hơi buồn. Giọng điệu nên nhẹ nhàng, có chút tiếc nuối.';
      case 'neutral':
        return 'Cô ấy bình thường, không vui không buồn.';
      case 'happy':
        return 'Cô ấy đang vui! Giọng điệu nên tích cực và năng lượng.';
      case 'very_happy':
        return 'Cô ấy đang rất vui! Có thể dùng nhiều emoji và thể hiện sự hào hứng.';
      case 'excited':
        return 'Cô ấy cực kỳ hào hứng và yêu thương! Thể hiện tình cảm mạnh mẽ.';
      default:
        return '';
    }
  },
};

export default moodService;
