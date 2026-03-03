// Premium tier definitions and utilities for frontend

export type PremiumTier = 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE';

export interface PremiumFeatures {
  dailyMessages: number;
  voiceMessages: boolean;
  imageGeneration: boolean;
  advancedPersonality: boolean;
  exclusiveScenes: boolean;
  noAds: boolean;
  prioritySupport: boolean;
  customBackgrounds: boolean;
  unlimitedCharacters: boolean;
  earlyAccess: boolean;
}

// Feature definitions by tier
export const PREMIUM_FEATURES: Record<PremiumTier, PremiumFeatures> = {
  FREE: {
    dailyMessages: 20,
    voiceMessages: false,
    imageGeneration: false,
    advancedPersonality: false,
    exclusiveScenes: false,
    noAds: false,
    prioritySupport: false,
    customBackgrounds: false,
    unlimitedCharacters: false,
    earlyAccess: false,
  },
  BASIC: {
    dailyMessages: 100,
    voiceMessages: true,
    imageGeneration: false,
    advancedPersonality: false,
    exclusiveScenes: false,
    noAds: true,
    prioritySupport: false,
    customBackgrounds: true,
    unlimitedCharacters: false,
    earlyAccess: false,
  },
  PRO: {
    dailyMessages: 500,
    voiceMessages: true,
    imageGeneration: true,
    advancedPersonality: true,
    exclusiveScenes: true,
    noAds: true,
    prioritySupport: false,
    customBackgrounds: true,
    unlimitedCharacters: true,
    earlyAccess: false,
  },
  ULTIMATE: {
    dailyMessages: -1, // Unlimited
    voiceMessages: true,
    imageGeneration: true,
    advancedPersonality: true,
    exclusiveScenes: true,
    noAds: true,
    prioritySupport: true,
    customBackgrounds: true,
    unlimitedCharacters: true,
    earlyAccess: true,
  },
};

// Tier hierarchy for comparison
const TIER_HIERARCHY: PremiumTier[] = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];

// Premium tier display info
export const TIER_INFO: Record<PremiumTier, { name: string; color: string; icon: string }> = {
  FREE: { name: 'Miễn phí', color: 'text-gray-400', icon: '🆓' },
  BASIC: { name: 'Basic', color: 'text-blue-400', icon: '⭐' },
  PRO: { name: 'Pro', color: 'text-purple-400', icon: '💎' },
  ULTIMATE: { name: 'Ultimate', color: 'text-yellow-400', icon: '👑' },
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
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(userTier: PremiumTier, feature: keyof PremiumFeatures): boolean {
  const features = PREMIUM_FEATURES[userTier];
  const value = features[feature];
  
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return false;
}

/**
 * Get feature value for user tier
 */
export function getFeatureValue<K extends keyof PremiumFeatures>(
  userTier: PremiumTier, 
  feature: K
): PremiumFeatures[K] {
  return PREMIUM_FEATURES[userTier][feature];
}

/**
 * Get minimum tier required for a feature
 */
export function getMinimumTierForFeature(feature: keyof PremiumFeatures): PremiumTier {
  for (const tier of TIER_HIERARCHY) {
    if (hasFeatureAccess(tier, feature)) {
      return tier;
    }
  }
  return 'ULTIMATE';
}

/**
 * Check if user should see premium upsell
 */
export function shouldShowUpsell(userTier: PremiumTier, feature: keyof PremiumFeatures): boolean {
  return !hasFeatureAccess(userTier, feature);
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
  desiredFeature: keyof PremiumFeatures
): { targetTier: PremiumTier; message: string } | null {
  if (hasFeatureAccess(currentTier, desiredFeature)) {
    return null;
  }

  const targetTier = getMinimumTierForFeature(desiredFeature);
  const tierInfo = TIER_INFO[targetTier];

  return {
    targetTier,
    message: `Nâng cấp lên gói ${tierInfo.name} để mở khóa tính năng này`,
  };
}
