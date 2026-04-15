import { prisma } from '../../lib/prisma';

type SocialStat = 'charm' | 'knowledge' | 'guts' | 'kindness' | 'proficiency';

const STAT_THRESHOLDS: Record<SocialStat, { level: number; unlocks: string }[]> = {
  charm: [
    { level: 1, unlocks: 'Flirty dialogue options' },
    { level: 3, unlocks: 'Romantic gift suggestions' },
    { level: 5, unlocks: 'Special date scenes' },
  ],
  knowledge: [
    { level: 1, unlocks: 'Intellectual conversation topics' },
    { level: 3, unlocks: 'Book recommendations' },
    { level: 5, unlocks: 'Deep philosophical discussions' },
  ],
  guts: [
    { level: 1, unlocks: 'Bold dialogue options' },
    { level: 3, unlocks: 'Confession scenes' },
    { level: 5, unlocks: 'Adventure date scenes' },
  ],
  kindness: [
    { level: 1, unlocks: 'Caring dialogue options' },
    { level: 3, unlocks: 'Comfort gift suggestions' },
    { level: 5, unlocks: 'Heart-to-heart scenes' },
  ],
  proficiency: [
    { level: 1, unlocks: 'Craft basic gifts' },
    { level: 3, unlocks: 'Craft rare gifts' },
    { level: 5, unlocks: 'Create custom scenes' },
  ],
};

export const socialStatsService = {
  async getStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { charm: true, knowledge: true, guts: true, kindness: true, proficiency: true },
    });
    if (!user) return null;

    return {
      charm: { value: user.charm, unlocks: this.getUnlocks('charm', user.charm) },
      knowledge: { value: user.knowledge, unlocks: this.getUnlocks('knowledge', user.knowledge) },
      guts: { value: user.guts, unlocks: this.getUnlocks('guts', user.guts) },
      kindness: { value: user.kindness, unlocks: this.getUnlocks('kindness', user.kindness) },
      proficiency: { value: user.proficiency, unlocks: this.getUnlocks('proficiency', user.proficiency) },
    };
  },

  getUnlocks(stat: SocialStat, value: number) {
    return STAT_THRESHOLDS[stat].filter(t => value >= t.level).map(t => t.unlocks);
  },

  async incrementStat(userId: string, stat: SocialStat, amount: number = 1) {
    await prisma.user.update({
      where: { id: userId },
      data: { [stat]: { increment: amount } },
    });
  },

  async onChatMessage(userId: string) {
    await this.incrementStat(userId, 'kindness');
    await this.incrementStat(userId, 'knowledge');
  },

  async onGiftSent(userId: string) {
    await this.incrementStat(userId, 'charm');
    await this.incrementStat(userId, 'proficiency');
  },

  async onQuestComplete(userId: string) {
    await this.incrementStat(userId, 'guts');
  },
};
