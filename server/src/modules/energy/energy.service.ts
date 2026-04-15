import { prisma } from '../../lib/prisma';
import { getTierConfig } from '../admin/tier-config.service';
import type { PremiumTier } from '../../lib/prisma';

const ENERGY_COSTS = {
  chatMessage: 2,
  sendGift: 5,
  changeScene: 3,
  startQuest: 5,
  dmMessage: 1,
} as const;

const VIP_ENERGY_BONUS: Record<string, number> = {
  FREE: 0,
  BASIC: 20,
  PRO: 40,
  ULTIMATE: 60,
};

const REGEN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const REGEN_AMOUNT = 10;

const ENERGY_ITEMS = {
  cafe: { recover: 20, priceCoins: 100 },
  soda: { recover: 10, priceCoins: 50 },
  meal: { recover: 40, priceCoins: 200 },
} as const;

export const energyService = {
  ENERGY_COSTS,

  async checkAndRegenEnergy(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { energy: true, maxEnergy: true, energyRegenAt: true, premiumTier: true },
    });
    if (!user) return;

    const now = new Date();
    const lastRegen = user.energyRegenAt || now;
    const hoursPassed = Math.floor((now.getTime() - lastRegen.getTime()) / REGEN_INTERVAL_MS);

    if (hoursPassed > 0) {
      const bonus = VIP_ENERGY_BONUS[user.premiumTier || 'FREE'] || 0;
      const effectiveMax = user.maxEnergy + bonus;
      const newEnergy = Math.min(effectiveMax, user.energy + hoursPassed * REGEN_AMOUNT);

      await prisma.user.update({
        where: { id: userId },
        data: { energy: newEnergy, energyRegenAt: now },
      });
    }
  },

  async consumeEnergy(userId: string, action: keyof typeof ENERGY_COSTS): Promise<boolean> {
    await this.checkAndRegenEnergy(userId);

    const cost = ENERGY_COSTS[action];
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { energy: true },
    });
    if (!user || user.energy < cost) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { energy: { decrement: cost } },
    });
    return true;
  },

  async getEnergyStatus(userId: string) {
    await this.checkAndRegenEnergy(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { energy: true, maxEnergy: true, premiumTier: true },
    });
    if (!user) return { current: 0, max: 100, bonus: 0 };

    const bonus = VIP_ENERGY_BONUS[user.premiumTier || 'FREE'] || 0;
    return { current: user.energy, max: user.maxEnergy + bonus, bonus };
  },

  async useEnergyItem(userId: string, itemId: keyof typeof ENERGY_ITEMS) {
    const item = ENERGY_ITEMS[itemId];
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, energy: true, maxEnergy: true, premiumTier: true },
    });
    if (!user) return { success: false, reason: 'User not found' };
    if (user.coins < item.priceCoins) return { success: false, reason: 'Not enough coins' };

    const bonus = VIP_ENERGY_BONUS[user.premiumTier || 'FREE'] || 0;
    const effectiveMax = user.maxEnergy + bonus;
    const recoverAmount = Math.min(item.recover, effectiveMax - user.energy);
    if (recoverAmount <= 0) return { success: false, reason: 'Energy already full' };

    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { decrement: item.priceCoins },
        energy: { increment: recoverAmount },
        energyRegenAt: new Date(),
      },
    });

    return { success: true, recovered: recoverAmount, cost: item.priceCoins };
  },
};
