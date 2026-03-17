/**
 * Tier Config Service
 * Manages per-tier feature configs stored in SystemConfig DB + Redis cache.
 * Falls back to hardcoded defaults when no DB row exists yet.
 */

import { prisma } from '../../lib/prisma';
import { cache, CacheTTL } from '../../lib/redis';

export type PremiumTier = 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE';

export interface TierConfig {
  maxCharacters: number;         // -1 = unlimited
  maxMessagesPerDay: number;     // -1 = unlimited
  adFree: boolean;
  voiceMessages: boolean;
  sendImages: boolean;
  sendVideos: boolean;
  sendStickers: boolean;
  canAccessPremiumScenes: boolean;
  canAccessPremiumGifts: boolean;
  canAccessPremiumQuests: boolean;
  prioritySupport: boolean;
  earlyAccess: boolean;
}

export type AllTierConfigs = Record<PremiumTier, TierConfig>;

const DB_KEY = 'premium_tier_configs';
const CACHE_KEY = 'premium:tier_configs';
const CACHE_TTL_SECS = CacheTTL.QUESTS; // 1 hour

/** Hardcoded defaults — used when no DB row exists yet */
export const DEFAULT_TIER_CONFIGS: AllTierConfigs = {
  FREE: {
    maxCharacters: 1,
    maxMessagesPerDay: -1,
    adFree: false,
    voiceMessages: false,
    sendImages: false,
    sendVideos: false,
    sendStickers: false,
    canAccessPremiumScenes: false,
    canAccessPremiumGifts: false,
    canAccessPremiumQuests: false,
    prioritySupport: false,
    earlyAccess: false,
  },
  BASIC: {
    maxCharacters: 5,
    maxMessagesPerDay: -1,
    adFree: true,
    voiceMessages: true,
    sendImages: true,
    sendVideos: true,
    sendStickers: true,
    canAccessPremiumScenes: true,
    canAccessPremiumGifts: true,
    canAccessPremiumQuests: true,
    prioritySupport: false,
    earlyAccess: false,
  },
  PRO: {
    maxCharacters: 5,
    maxMessagesPerDay: -1,
    adFree: true,
    voiceMessages: true,
    sendImages: true,
    sendVideos: true,
    sendStickers: true,
    canAccessPremiumScenes: true,
    canAccessPremiumGifts: true,
    canAccessPremiumQuests: true,
    prioritySupport: true,
    earlyAccess: true,
  },
  ULTIMATE: {
    maxCharacters: -1,
    maxMessagesPerDay: -1,
    adFree: true,
    voiceMessages: true,
    sendImages: true,
    sendVideos: true,
    sendStickers: true,
    canAccessPremiumScenes: true,
    canAccessPremiumGifts: true,
    canAccessPremiumQuests: true,
    prioritySupport: true,
    earlyAccess: true,
  },
};

/**
 * Load all tier configs via cache → DB → hardcoded defaults.
 * DB row is seeded from defaults on first call.
 */
export async function getAllTierConfigs(): Promise<AllTierConfigs> {
  return cache.getOrSet<AllTierConfigs>(
    CACHE_KEY,
    async () => {
      const row = await prisma.systemConfig.findUnique({ where: { key: DB_KEY } });

      if (row?.value) {
        // Merge DB config with defaults to handle any newly added fields
        return mergeWithDefaults(row.value as Partial<AllTierConfigs>);
      }

      // First time: seed DB with defaults
      const serialized = JSON.parse(JSON.stringify(DEFAULT_TIER_CONFIGS));
      await prisma.systemConfig.upsert({
        where: { key: DB_KEY },
        update: { value: serialized },
        create: { key: DB_KEY, value: serialized },
      });

      return DEFAULT_TIER_CONFIGS;
    },
    CACHE_TTL_SECS,
  );
}

/** Get config for a single tier */
export async function getTierConfig(tier: PremiumTier): Promise<TierConfig> {
  const all = await getAllTierConfigs();
  return all[tier];
}

/** Update config for a specific tier, persist to DB, invalidate cache */
export async function updateTierConfig(
  tier: PremiumTier,
  patch: Partial<TierConfig>,
): Promise<AllTierConfigs> {
  const current = await getAllTierConfigs();
  const updated: AllTierConfigs = {
    ...current,
    [tier]: { ...current[tier], ...patch },
  };

  const serialized = JSON.parse(JSON.stringify(updated));
  await prisma.systemConfig.upsert({
    where: { key: DB_KEY },
    update: { value: serialized },
    create: { key: DB_KEY, value: serialized },
  });

  // Invalidate cache so next request reloads from DB
  await cache.del(CACHE_KEY);
  return updated;
}

/** Merge DB config with defaults to handle newly added fields gracefully */
function mergeWithDefaults(dbConfig: Partial<AllTierConfigs>): AllTierConfigs {
  const tiers: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];
  const result: AllTierConfigs = { ...DEFAULT_TIER_CONFIGS };
  for (const tier of tiers) {
    if (dbConfig[tier]) {
      result[tier] = { ...DEFAULT_TIER_CONFIGS[tier], ...dbConfig[tier] };
    }
  }
  return result;
}
