/**
 * Redis Client
 * Provides a singleton Redis connection for caching.
 * Falls back gracefully if Redis is unavailable (caching is optional).
 */

import { createModuleLogger } from './logger';

const log = createModuleLogger('Redis');

// Lightweight Redis wrapper using ioredis
let redisClient: import('ioredis').default | null = null;
let isConnected = false;
let connectionAttempted = false;

async function getClient(): Promise<import('ioredis').default | null> {
  if (redisClient && isConnected) return redisClient;
  if (connectionAttempted && !isConnected) return null;

  connectionAttempted = true;

  try {
    const Redis = (await import('ioredis')).default;
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          log.warn('Redis retry limit reached, giving up');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
      // Performance: keep connection alive
      keepAlive: 30000,
      // Enable offline queue so commands don't fail during brief disconnects
      enableOfflineQueue: true,
      // Connection pool — ioredis uses a single connection with pipelining by default
      // which is more efficient than multiple connections for most cases
    });

    redisClient.on('connect', () => {
      isConnected = true;
      log.info('Connected');
    });

    redisClient.on('error', (err) => {
      log.warn('Connection error: ' + err.message);
      isConnected = false;
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    log.warn('Failed to connect, caching disabled: ' + (err as Error).message);
    isConnected = false;
    return null;
  }
}

/**
 * Cache-aside pattern helper
 */
export const cache = {
  /**
   * Get a cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getClient();
      if (!client) return null;

      const data = client ? await client.get(key) : null;
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  /**
   * Set a cached value with TTL (in seconds)
   */
  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    try {
      const client = await getClient();
      if (!client) return;

      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Silently fail - caching is best-effort
    }
  },

  /**
   * Delete a cached key
   */
  async del(...keys: string[]): Promise<void> {
    try {
      const client = await getClient();
      if (!client || keys.length === 0) return;

      await client.del(...keys);
    } catch {
      // Silently fail
    }
  },

  /**
   * Delete all keys matching a pattern using SCAN (non-blocking, unlike KEYS)
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const client = await getClient();
      if (!client) return;

      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Silently fail
    }
  },

  /**
   * Get or set: fetch from cache, or compute and store
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Atomic SET if Not eXists with TTL
   * Returns true if the key was set, false if it already existed
   * Used for distributed locking and deduplication
   */
  async setNX(key: string, value: unknown, ttlSeconds: number = 60): Promise<boolean> {
    try {
      const client = await getClient();
      if (!client) return false;

      const result = await client.set(key, JSON.stringify(value), 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch {
      return false;
    }
  },

  /**
   * Increment a numeric key atomically
   * Auto-initializes to 1 if key doesn't exist
   */
  async incr(key: string): Promise<number> {
    try {
      const client = await getClient();
      if (!client) return 0;
      return await client.incr(key);
    } catch {
      return 0;
    }
  },

  /**
   * Set TTL on an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const client = await getClient();
      if (!client) return false;
      const result = await client.expire(key, ttlSeconds);
      return result === 1;
    } catch {
      return false;
    }
  },

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const client = await getClient();
      if (!client) return false;
      await client.ping();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Disconnect Redis client gracefully
   */
  async disconnect(): Promise<void> {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      isConnected = false;
    }
  },
};

// Cache key builders
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userAuth: (userId: string) => `user:auth:${userId}`,
  character: (userId: string) => `character:active:${userId}`,
  characterById: (characterId: string) => `character:${characterId}`,
  characterWithFacts: (characterId: string) => `character:${characterId}:facts`,
  quests: () => 'quests:all',
  gifts: (category?: string) => category ? `gifts:${category}` : 'gifts:all',
  giftInventory: (userId: string) => `gifts:inventory:${userId}`,
  userSettings: (userId: string) => `settings:${userId}`,
  conversations: (userId: string) => `conversations:${userId}`,
  leaderboard: (category: string) => `leaderboard:${category}`,
};

// TTL constants (in seconds)
export const CacheTTL = {
  USER_AUTH: 15 * 60,       // 15 minutes (matches access token)
  USER_PROFILE: 60 * 60,    // 1 hour
  CHARACTER: 30 * 60,        // 30 minutes
  QUESTS: 60 * 60,           // 1 hour
  GIFTS: 60 * 60,            // 1 hour
  INVENTORY: 5 * 60,         // 5 minutes (changes frequently)
  SETTINGS: 30 * 60,         // 30 minutes
  CONVERSATIONS: 60,         // 1 minute (DM list, changes often)
  LEADERBOARD: 5 * 60,       // 5 minutes
  SOCKET_AUTH: 10 * 60,      // 10 minutes (socket authentication)
};
