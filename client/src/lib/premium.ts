// Premium tier definitions and utilities for frontend
// Synced with backend: server/src/lib/constants.ts

export type PremiumTier = 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE';

export interface PremiumFeatures {
  maxMessagesPerDay: number;
  maxCharacters: number;
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

export type PremiumBooleanFeature = {
  [K in keyof PremiumFeatures]: PremiumFeatures[K] extends boolean ? K : never;
}[keyof PremiumFeatures];

export type AllTierConfigs = Record<PremiumTier, PremiumFeatures>;

// Feature definitions by tier
// Current system: FREE vs VIP (BASIC/PRO/ULTIMATE all treated as VIP)
export const PREMIUM_FEATURES: AllTierConfigs = {
  FREE: {
    maxMessagesPerDay: -1,
    maxCharacters: 1,
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
  // VIP tiers - all have same core benefits
  BASIC: {
    maxMessagesPerDay: -1,
    maxCharacters: 5,
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
    maxMessagesPerDay: -1,
    maxCharacters: 5,
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
    maxMessagesPerDay: -1,
    maxCharacters: -1,
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

// Tier hierarchy for comparison
const TIER_HIERARCHY: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

/**
 * Check if tier is VIP (any paid tier)
 */
export function isVipTier(tier: PremiumTier): boolean {
  return tier !== 'FREE';
}

// Premium tier display info
export const TIER_INFO: Record<PremiumTier, { name: string; displayName: string; color: string; icon: string }> = {
  FREE: { name: 'FREE', displayName: 'Miễn phí', color: 'text-gray-400', icon: '🆓' },
  BASIC: { name: 'VIP', displayName: 'VIP Premium', color: 'text-love', icon: '👑' },
  PRO: { name: 'VIP', displayName: 'VIP Premium', color: 'text-love', icon: '👑' },
  ULTIMATE: { name: 'VIP', displayName: 'VIP Premium', color: 'text-love', icon: '👑' },
};

/**
 * Check if user tier meets minimum required tier
 */
export function hasTierAccess(userTier: PremiumTier, requiredTier: PremiumTier): boolean {
  const userIndex = TIER_HIERARCHY.indexOf(userTier);
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
  return userIndex >= requiredIndex;
}

/**
 * Get feature value for user tier
 */
export function getFeatureValue<K extends keyof PremiumFeatures>(
  userTier: PremiumTier, 
  feature: K,
  configs: AllTierConfigs = PREMIUM_FEATURES,
): PremiumFeatures[K] {
  return configs[userTier][feature];
}

/**
 * Get minimum tier required for a feature
 */
export function getMinimumTierForFeature(
  feature: PremiumBooleanFeature,
  configs: AllTierConfigs = PREMIUM_FEATURES,
): PremiumTier {
  for (const tier of TIER_HIERARCHY) {
    if (hasFeatureAccess(tier, feature, configs)) {
      return tier;
    }
  }
  return 'ULTIMATE';
}

/**
 * Check if user should see premium upsell
 */
export function shouldShowUpsell(
  userTier: PremiumTier,
  feature: PremiumBooleanFeature,
  configs: AllTierConfigs = PREMIUM_FEATURES,
): boolean {
  return !hasFeatureAccess(userTier, feature, configs);
}

/**
 * Format daily message limit display
 */
export function formatMessageLimit(limit: number): string {
  if (limit < 0) return 'Không giới hạn';
  return `${limit} tin/ngày`;
}

/**
 * Get upgrade suggestion based on desired feature
 */
export function getUpgradeSuggestion(
  currentTier: PremiumTier,
  desiredFeature: PremiumBooleanFeature,
  configs: AllTierConfigs = PREMIUM_FEATURES,
): { targetTier: PremiumTier; message: string } | null {
  if (hasFeatureAccess(currentTier, desiredFeature, configs)) {
    return null;
  }

  const targetTier = getMinimumTierForFeature(desiredFeature, configs);
  const tierInfo = TIER_INFO[targetTier];

  return {
    targetTier,
    message: `Nâng cấp lên gói ${tierInfo.displayName} để mở khóa tính năng này`,
  };
}

export function hasFeatureAccess(
  userTier: PremiumTier,
  feature: PremiumBooleanFeature,
  configs: AllTierConfigs = PREMIUM_FEATURES,
): boolean {
  const features = configs[userTier];
  const value = features[feature];

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return false;
}
