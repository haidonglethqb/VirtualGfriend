import { prisma } from '../../lib/prisma'
import { cache, CacheTTL } from '../../lib/redis'
import { createModuleLogger } from '../../lib/logger'

const log = createModuleLogger('Leaderboard')

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string | null
  displayName: string | null
  avatar: string | null
  isPremium: boolean
  value: number
}

export const leaderboardService = {
  /**
   * Top users by character level (highest level character)
   * Uses two-query approach to avoid N+1 with distinct + nested relation.
   */
  async getByLevel(limit = 20): Promise<LeaderboardEntry[]> {
    const cacheKey = 'leaderboard:level'
    const cached = await cache.get<LeaderboardEntry[]>(cacheKey)
    if (cached) return cached.slice(0, limit)

    // Step 1: Get top userIds with their best character (no nested relation)
    // Uses distinct: ['userId'] to get one character per user.
    // The two-query approach avoids PostgreSQL's DISTINCT ON ordering constraints
    // and prevents N+1 queries when fetching user details.
    const characterResults = await prisma.character.findMany({
      where: { isActive: true },
      orderBy: [{ level: 'desc' }, { experience: 'desc' }],
      take: limit,
      distinct: ['userId'],
      select: {
        userId: true,
        level: true,
      },
    })

    // Step 2: Batch-fetch users with WHERE id IN (...)
    const userIds = characterResults.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isPremium: true,
      },
    })

    const userMap = new Map(users.map(u => [u.id, u]))
    const charMap = new Map(characterResults.map(r => [r.userId, r.level]))

    const entries: LeaderboardEntry[] = characterResults.map((r, i) => {
      const user = userMap.get(r.userId)
      return {
        rank: i + 1,
        userId: r.userId,
        username: user?.username ?? null,
        displayName: user?.displayName ?? null,
        avatar: user?.avatar ?? null,
        isPremium: user?.isPremium ?? false,
        value: charMap.get(r.userId) ?? 0,
      }
    })

    await cache.set(cacheKey, entries, 300) // 5 min cache
    return entries
  },

  /**
   * Top users by affection (highest affection with any character)
   * Uses two-query approach to avoid N+1 with distinct + nested relation.
   */
  async getByAffection(limit = 20): Promise<LeaderboardEntry[]> {
    const cacheKey = 'leaderboard:affection'
    const cached = await cache.get<LeaderboardEntry[]>(cacheKey)
    if (cached) return cached.slice(0, limit)

    // Step 1: Get top userIds with their best affection (no nested relation)
    const characterResults = await prisma.character.findMany({
      where: { isActive: true },
      orderBy: { affection: 'desc' },
      take: limit,
      distinct: ['userId'],
      select: {
        userId: true,
        affection: true,
      },
    })

    // Step 2: Batch-fetch users with WHERE id IN (...)
    const userIds = characterResults.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isPremium: true,
      },
    })

    const userMap = new Map(users.map(u => [u.id, u]))
    const affMap = new Map(characterResults.map(r => [r.userId, r.affection]))

    const entries: LeaderboardEntry[] = characterResults.map((r, i) => {
      const user = userMap.get(r.userId)
      return {
        rank: i + 1,
        userId: r.userId,
        username: user?.username ?? null,
        displayName: user?.displayName ?? null,
        avatar: user?.avatar ?? null,
        isPremium: user?.isPremium ?? false,
        value: affMap.get(r.userId) ?? 0,
      }
    })

    await cache.set(cacheKey, entries, 300)
    return entries
  },

  /**
   * Top users by streak
   */
  async getByStreak(limit = 20): Promise<LeaderboardEntry[]> {
    const cacheKey = 'leaderboard:streak'
    const cached = await cache.get<LeaderboardEntry[]>(cacheKey)
    if (cached) return cached.slice(0, limit)

    const results = await prisma.user.findMany({
      where: { streak: { gt: 0 } },
      orderBy: { streak: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isPremium: true,
        streak: true,
      },
    })

    const entries: LeaderboardEntry[] = results.map((r, i) => ({
      rank: i + 1,
      userId: r.id,
      username: r.username,
      displayName: r.displayName,
      avatar: r.avatar,
      isPremium: r.isPremium,
      value: r.streak,
    }))

    await cache.set(cacheKey, entries, 300)
    return entries
  },

  /**
   * Top users by total achievements unlocked
   */
  async getByAchievements(limit = 20): Promise<LeaderboardEntry[]> {
    const cacheKey = 'leaderboard:achievements'
    const cached = await cache.get<LeaderboardEntry[]>(cacheKey)
    if (cached) return cached.slice(0, limit)

    const results = await prisma.userAchievement.groupBy({
      by: ['userId'],
      where: { unlockedAt: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    })

    const userIds = results.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true, avatar: true, isPremium: true },
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const entries: LeaderboardEntry[] = results.map((r, i) => {
      const user = userMap.get(r.userId)
      return {
        rank: i + 1,
        userId: r.userId,
        username: user?.username ?? null,
        displayName: user?.displayName ?? null,
        avatar: user?.avatar ?? null,
        isPremium: user?.isPremium ?? false,
        value: r._count.id,
      }
    })

    await cache.set(cacheKey, entries, 300)
    return entries
  },

  /**
   * Get current user's rank in a specific category
   */
  async getUserRank(userId: string, category: string): Promise<{ rank: number; value: number } | null> {
    const leaderboard = await this.getByCategory(category)
    const entry = leaderboard.find(e => e.userId === userId)
    return entry ? { rank: entry.rank, value: entry.value } : null
  },

  async getByCategory(category: string, limit = 20): Promise<LeaderboardEntry[]> {
    switch (category) {
      case 'level': return this.getByLevel(limit)
      case 'affection': return this.getByAffection(limit)
      case 'streak': return this.getByStreak(limit)
      case 'achievements': return this.getByAchievements(limit)
      default: return this.getByLevel(limit)
    }
  },
}
