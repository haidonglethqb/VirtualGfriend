import { prisma } from '../../lib/prisma';

interface AffectionHistoryPoint {
  date: string;
  affection: number;
  level: number;
}

interface ActivityHeatmapData {
  date: string;
  count: number;
}

interface AnalyticsData {
  affectionHistory: AffectionHistoryPoint[];
  activityHeatmap: ActivityHeatmapData[];
  totalMessages: number;
  totalGifts: number;
  averageMessagesPerDay: number;
  relationshipDays: number;
  milestones: {
    type: string;
    achievedAt: Date;
    description: string;
  }[];
  conversationTopics: {
    topic: string;
    count: number;
  }[];
}

export const analyticsService = {
  /**
   * Get comprehensive analytics for a user's character
   */
  async getCharacterAnalytics(userId: string): Promise<AnalyticsData> {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new Error('Character not found');
    }

    // Get messages for analysis
    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Build affection history from character's current state (simplified)
    const affectionHistory: AffectionHistoryPoint[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      // Estimate historical affection (simplified - grows linearly to current)
      const progress = (30 - i) / 30;
      const estimatedAffection = Math.round(character.affection * progress);
      
      affectionHistory.push({
        date: dateKey,
        affection: estimatedAffection,
        level: Math.floor(progress * character.level) || 1,
      });
    }

    // Build activity heatmap from messages
    const activityMap = new Map<string, number>();
    messages.forEach(msg => {
      const dateKey = msg.createdAt.toISOString().split('T')[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
    });

    const activityHeatmap: ActivityHeatmapData[] = Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Total counts
    const totalMessages = await prisma.message.count({
      where: { userId },
    });

    // Count gifts from gift history
    const totalGifts = await prisma.giftHistory.count({
      where: { userId },
    });

    // Calculate average messages per day
    const daysSinceCreation = Math.max(1, Math.ceil(
      (Date.now() - character.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    ));
    const averageMessagesPerDay = Math.round((totalMessages / daysSinceCreation) * 10) / 10;

    // Analyze conversation topics from facts
    const facts = await prisma.characterFact.findMany({
      where: { characterId: character.id },
    });

    const topicCounts = new Map<string, number>();
    facts.forEach((fact: { category?: string | null }) => {
      const category = fact.category || 'other';
      topicCounts.set(category, (topicCounts.get(category) || 0) + 1);
    });

    const conversationTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    return {
      affectionHistory,
      activityHeatmap,
      totalMessages,
      totalGifts,
      averageMessagesPerDay,
      relationshipDays: daysSinceCreation,
      milestones: [], // Simplified - no milestones table
      conversationTopics,
    };
  },

  /**
   * Get simple stats for dashboard
   */
  async getDashboardStats(userId: string): Promise<{
    messagesToday: number;
    streak: number;
    giftsGiven: number;
    affectionToday: number;
  }> {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      return { messagesToday: 0, streak: 0, giftsGiven: 0, affectionToday: 0 };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const messagesToday = await prisma.message.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    });

    // Calculate streak from message history - Optimized with a single query
    // Get message counts grouped by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const messageCounts = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::bigint as count
      FROM "messages"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    // Calculate streak from the message counts
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const messageMap = new Map(
      messageCounts.map(mc => [new Date(mc.date).toISOString().split('T')[0], Number(mc.count)])
    );

    let currentDate = new Date(today);
    for (let i = 0; i < 30; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const messagesOnDay = messageMap.get(dateKey) || 0;

      if (messagesOnDay > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i > 0) {
        // If not today and no messages, break the streak
        break;
      } else {
        // Today has no messages, check yesterday
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    const giftsGiven = await prisma.giftHistory.count({
      where: { userId },
    });

    // Estimate affection gained today based on messages
    const affectionToday = Math.min(messagesToday * 2, 50);

    return {
      messagesToday,
      streak,
      giftsGiven,
      affectionToday,
    };
  },
};

export default analyticsService;
