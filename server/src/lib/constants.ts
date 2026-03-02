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
