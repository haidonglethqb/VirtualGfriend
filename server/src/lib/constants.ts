/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// Message Length Limits
export const MESSAGE_LIMITS = {
  MAX_CHAT_MESSAGE_LENGTH: 2000,
  MAX_DM_MESSAGE_LENGTH: 2000,
  MAX_FACT_VALUE_LENGTH: 500,
  MAX_CHARACTER_NAME_LENGTH: 50,
} as const;

// Password Validation
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true, // Required: at least 1 special character
} as const;

// Password validation regex patterns
export const PASSWORD_PATTERNS = {
  HAS_UPPERCASE: /[A-Z]/,
  HAS_LOWERCASE: /[a-z]/,
  HAS_NUMBER: /[0-9]/,
  HAS_SPECIAL: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const;

// Validate password and return errors
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Mật khẩu phải có ít nhất ${PASSWORD_REQUIREMENTS.MIN_LENGTH} ký tự`);
  }
  if (password.length > PASSWORD_REQUIREMENTS.MAX_LENGTH) {
    errors.push(`Mật khẩu không được quá ${PASSWORD_REQUIREMENTS.MAX_LENGTH} ký tự`);
  }
  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !PASSWORD_PATTERNS.HAS_UPPERCASE.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
  }
  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !PASSWORD_PATTERNS.HAS_LOWERCASE.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
  }
  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !PASSWORD_PATTERNS.HAS_NUMBER.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 số');
  }
  if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL && !PASSWORD_PATTERNS.HAS_SPECIAL.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
  }
  
  return { valid: errors.length === 0, errors };
}

// Premium Tier Features
// Current system: FREE vs VIP (BASIC/PRO/ULTIMATE all treated as VIP)
export const PREMIUM_FEATURES = {
  FREE: {
    maxCharacters: 1,
    maxMessagesPerDay: -1, // Unlimited for all users
    maxScenes: 3,
    canAccessPremiumScenes: false,
    canAccessPremiumGifts: false,
    canAccessPremiumQuests: false,
    aiResponseQuality: 'standard',
    adFree: false,
    prioritySupport: false,
    earlyAccess: false,
    exclusiveContent: false,
  },
  // VIP tiers - all have same core benefits
  BASIC: {
    maxCharacters: 5,
    maxMessagesPerDay: -1, // Unlimited
    maxScenes: -1, // Unlimited
    canAccessPremiumScenes: true,
    canAccessPremiumGifts: true,
    canAccessPremiumQuests: true,
    aiResponseQuality: 'enhanced',
    adFree: true,
    prioritySupport: false,
    earlyAccess: false,
    exclusiveContent: false,
  },
  PRO: {
    maxCharacters: 5,
    maxMessagesPerDay: -1, // Unlimited
    maxScenes: -1, // Unlimited
    canAccessPremiumScenes: true,
    canAccessPremiumGifts: true,
    canAccessPremiumQuests: true,
    aiResponseQuality: 'premium',
    adFree: true,
    prioritySupport: true,
    earlyAccess: true,
    exclusiveContent: true,
  },
  ULTIMATE: {
    maxCharacters: -1, // Unlimited
    maxMessagesPerDay: -1,
    maxScenes: -1,
    canAccessPremiumScenes: true,
    canAccessPremiumGifts: true,
    canAccessPremiumQuests: true,
    aiResponseQuality: 'premium',
    adFree: true,
    prioritySupport: true,
    earlyAccess: true,
    exclusiveContent: true,
  },
} as const;

// Helper to check if user is VIP (any paid tier)
export function isVipTier(tier: keyof typeof PREMIUM_FEATURES): boolean {
  return tier !== 'FREE';
}

// Relationship Stage Thresholds
export const RELATIONSHIP_THRESHOLDS = {
  STRANGER: 0,
  ACQUAINTANCE: 100,
  FRIEND: 250,
  CLOSE_FRIEND: 450,
  CRUSH: 600,
  DATING: 750,
  IN_LOVE: 850,
  LOVER: 900,
} as const;

// Scene categories tied to relationship stages
export const SCENE_PROGRESSION = {
  STRANGER: ['school_classroom', 'public_street', 'bus_stop'],
  ACQUAINTANCE: ['cafe', 'library', 'park_day'],
  FRIEND: ['home_living_room', 'restaurant', 'movie_theater'],
  CLOSE_FRIEND: ['beach_day', 'amusement_park', 'shopping_mall'],
  CRUSH: ['park_sunset', 'rooftop_view', 'garden'],
  DATING: ['fancy_restaurant', 'beach_night', 'festival'],
  IN_LOVE: ['romantic_getaway', 'couple_spa', 'sunset_cruise'],
  LOVER: ['bedroom', 'vacation_resort', 'stargazing', 'proposal_spot'],
} as const;

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  DEDUPLICATION: 60,        // Message deduplication window
  USER_AUTH: 15 * 60,       // 15 minutes (matches access token)
  USER_PROFILE: 60 * 60,    // 1 hour
  CHARACTER: 30 * 60,       // 30 minutes
  SOCKET_AUTH: 10 * 60,     // 10 minutes
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  SOCKET_MESSAGE_SEND: {
    MAX_REQUESTS: 10,       // Max messages
    WINDOW_MS: 10000,       // Per 10 seconds
  },
  SOCKET_DM_SEND: {
    MAX_REQUESTS: 20,       // Max DMs
    WINDOW_MS: 60000,       // Per minute
  },
  SOCKET_TYPING: {
    MAX_REQUESTS: 30,       // Max typing events
    WINDOW_MS: 60000,       // Per minute
  },
} as const;

// Validation Ranges
export const VALIDATION = {
  FACT_IMPORTANCE_MIN: 1,
  FACT_IMPORTANCE_MAX: 10,
  AFFECTION_MIN: 0,
  AFFECTION_MAX: 1000,
  LEVEL_MIN: 1,
  LEVEL_MAX: 100,
} as const;

// API Response Times (in milliseconds)
export const TIMINGS = {
  AI_TYPING_DELAY: 1500,    // Simulated typing delay for AI responses
  MOOD_CHECK_INTERVAL: 60000, // Mood check interval (1 minute)
} as const;
