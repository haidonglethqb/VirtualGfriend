import { prisma } from '../../lib/prisma';

export const eventService = {
  async getActiveEvents() {
    const now = new Date();
    return prisma.event.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { startDate: 'asc' },
      include: { eventQuests: true, eventRewards: true },
    });
  },

  async getUpcomingEvents() {
    const now = new Date();
    return prisma.event.findMany({
      where: { isActive: true, startDate: { gt: now } },
      orderBy: { startDate: 'asc' },
      take: 5,
    });
  },

  async checkEventQuestBonus(questId: string) {
    const now = new Date();
    const eventQuest = await prisma.eventQuest.findFirst({
      where: {
        questId,
        event: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      },
      include: { event: true },
    });
    return eventQuest?.bonusMultiplier || 1.0;
  },
};
