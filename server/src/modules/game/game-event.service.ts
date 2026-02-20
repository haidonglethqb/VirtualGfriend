/**
 * Game Event Service
 * Handles all game events, triggers, and progression
 * This is the central hub for quest progress, memories, and rewards
 */

import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { questService } from '../quest/quest.service';
import { characterService } from '../character/character.service';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('GameEvent');

// Recursion guard: max depth for processAction calls
const MAX_RECURSION_DEPTH = 3;

// Action types that can trigger quest progress
export type GameAction =
  | 'SEND_MESSAGE'
  | 'RECEIVE_MESSAGE'
  | 'SEND_GIFT'
  | 'DAILY_LOGIN'
  | 'FIRST_MESSAGE_TODAY'
  | 'REACH_AFFECTION_LEVEL'
  | 'COMPLETE_QUEST'
  | 'UNLOCK_SCENE'
  | 'RELATIONSHIP_UPGRADE';

// Milestone types for automatic memory creation
export type MilestoneType =
  | 'FIRST_CHAT'
  | 'FIRST_GIFT'
  | 'AFFECTION_100'
  | 'AFFECTION_500'
  | 'AFFECTION_1000'
  | 'RELATIONSHIP_FRIEND'
  | 'RELATIONSHIP_LOVER'
  | 'STREAK_7_DAYS'
  | 'STREAK_30_DAYS'
  | 'MESSAGES_100'
  | 'MESSAGES_500'
  | 'GIFTS_10'
  | 'GIFTS_50'
  | 'LEVEL_UP';

interface GameEventData {
  userId: string;
  characterId?: string;
  action: GameAction;
  metadata?: Record<string, unknown>;
}

export interface QuestCompletionResult {
  questId: string;
  questTitle: string;
  rewards: {
    coins: number;
    gems: number;
    xp: number;
    affection: number;
  };
}

export const gameEventService = {
  /**
   * Process a game action - updates quests, checks milestones, creates memories
   */
  async processAction(data: GameEventData, _depth: number = 0): Promise<{
    questsUpdated: number;
    questsCompleted: QuestCompletionResult[];
    milestonesUnlocked: string[];
    newMemories: string[];
  }> {
    const { userId, characterId, action, metadata } = data;

    const result = {
      questsUpdated: 0,
      questsCompleted: [] as QuestCompletionResult[],
      milestonesUnlocked: [] as string[],
      newMemories: [] as string[],
    };

    // Recursion guard — prevent unbounded meta-quest cascading
    if (_depth >= MAX_RECURSION_DEPTH) {
      log.warn(`Recursion depth ${_depth} reached for action ${action}, skipping`);
      return result;
    }

    // 1. Auto-start daily quests (debounced via Redis)
    await this.autoStartDailyQuests(userId);

    // 2. Update quest progress based on action
    const questUpdates = await this.updateQuestProgress(userId, action, metadata);
    result.questsUpdated = questUpdates.updated;
    result.questsCompleted = questUpdates.completed;

    // 3. Auto-claim completed quests and give rewards (parallel)
    await Promise.all(
      result.questsCompleted.map((completed) => this.autoClaimQuest(userId, completed.questId, _depth))
    );

    // 4. Increment Redis milestone counters for relevant actions
    if (action === 'SEND_MESSAGE') {
      const key = `milestone_msg_count:${userId}`;
      const current = await cache.get<number>(key);
      if (current !== null) {
        await cache.set(key, current + 1, 3600);
      }
    }
    if (action === 'SEND_GIFT') {
      const key = `milestone_gift_count:${userId}`;
      const current = await cache.get<number>(key);
      if (current !== null) {
        await cache.set(key, current + 1, 3600);
      }
    }

    // 5. Check for milestones
    if (characterId) {
      const milestones = await this.checkMilestones(userId, characterId, action, metadata);
      result.milestonesUnlocked = milestones.unlocked;
      result.newMemories = milestones.memories;
    }

    // 6. Update user stats
    await this.updateUserStats(userId, action);

    return result;
  },

  /**
   * Auto-start all daily quests for the user at the beginning of each day
   * Optimized: batch queries instead of per-quest DB calls
   */
  async autoStartDailyQuests(userId: string): Promise<void> {
    // Debounce: check Redis flag to avoid running on every action
    const cacheKey = `daily_quests_started:${userId}`;
    const alreadyStarted = await cache.get<boolean>(cacheKey);
    if (alreadyStarted) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all daily quests (single query)
    const dailyQuests = await prisma.quest.findMany({
      where: { type: 'DAILY', isActive: true },
    });

    if (dailyQuests.length === 0) return;

    const dailyQuestIds = dailyQuests.map((q) => q.id);

    // Get all existing user quests for daily quests today (single query)
    const existingToday = await prisma.userQuest.findMany({
      where: {
        userId,
        questId: { in: dailyQuestIds },
        startedAt: { gte: today },
      },
    });

    const alreadyStartedIds = new Set(existingToday.map((uq) => uq.questId));

    // Find quests that need to be started
    const questsToStart = dailyQuests.filter((q) => !alreadyStartedIds.has(q.id));

    if (questsToStart.length === 0) return;

    const questIdsToStart = questsToStart.map((q) => q.id);

    // Batch: delete old daily quest progress + create new in a single transaction
    await prisma.$transaction([
      // Delete old daily quest progress for quests that need restart
      prisma.userQuest.deleteMany({
        where: {
          userId,
          questId: { in: questIdsToStart },
          startedAt: { lt: today },
        },
      }),
      // Create new progress for today (batch create)
      ...questsToStart.map((quest) => {
        const requirements = quest.requirements as { count?: number };
        return prisma.userQuest.create({
          data: {
            userId,
            questId: quest.id,
            maxProgress: requirements.count || 1,
            status: 'IN_PROGRESS',
          },
        });
      }),
    ]);

    // Set Redis flag — TTL = seconds until midnight
    const midnight = new Date(today);
    midnight.setDate(midnight.getDate() + 1);
    const ttlSeconds = Math.max(1, Math.floor((midnight.getTime() - Date.now()) / 1000));
    await cache.set(cacheKey, true, ttlSeconds);
  },

  /**
   * Update quest progress based on action
   * Optimized: batches DB updates instead of individual queries per quest
   */
  async updateQuestProgress(
    userId: string,
    action: GameAction,
    metadata?: Record<string, unknown>
  ): Promise<{ updated: number; completed: QuestCompletionResult[] }> {
    const completed: QuestCompletionResult[] = [];
    let updated = 0;

    // Map actions to quest requirement actions
    const actionMapping: Record<GameAction, string[]> = {
      'SEND_MESSAGE': ['send_message', 'chat'],
      'RECEIVE_MESSAGE': ['receive_message'],
      'SEND_GIFT': ['send_gift', 'gift', 'first_gift'],
      'DAILY_LOGIN': ['daily_login', 'login'],
      'FIRST_MESSAGE_TODAY': ['first_message', 'morning_greeting', 'goodnight_message'],
      'REACH_AFFECTION_LEVEL': ['reach_affection'],
      'COMPLETE_QUEST': ['complete_quest'],
      'UNLOCK_SCENE': ['unlock_scene'],
      'RELATIONSHIP_UPGRADE': ['relationship_upgrade'],
    };

    const matchingActions = actionMapping[action] || [action.toLowerCase()];

    // Check for time-based quest matching
    const currentHour = new Date().getHours();
    const isMorning = currentHour >= 6 && currentHour < 10;
    const isEvening = currentHour >= 21 && currentHour <= 24;

    if (action === 'SEND_MESSAGE' || action === 'FIRST_MESSAGE_TODAY') {
      if (isMorning) matchingActions.push('morning_greeting');
      if (isEvening) matchingActions.push('goodnight_message');
    }

    const messageContent = (metadata?.content as string)?.toLowerCase() || '';
    if (messageContent.includes('yêu') || messageContent.includes('thương') || messageContent.includes('nhớ')) {
      matchingActions.push('romantic_message');
    }

    // Find all in-progress quests (single query)
    const userQuests = await prisma.userQuest.findMany({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
      include: { quest: true },
    });

    // Collect batch updates
    const batchUpdates: { id: string; progress: number; isCompleted: boolean; quest: typeof userQuests[0]['quest'] }[] = [];

    for (const uq of userQuests) {
      const requirements = uq.quest.requirements as { action?: string; count?: number };

      if (requirements.action && matchingActions.includes(requirements.action)) {
        const increment = (metadata?.count as number) || 1;
        const newProgress = Math.min(uq.progress + increment, uq.maxProgress);
        const isCompleted = newProgress >= uq.maxProgress;

        batchUpdates.push({ id: uq.id, progress: newProgress, isCompleted, quest: uq.quest });
        updated++;

        if (isCompleted) {
          completed.push({
            questId: uq.quest.id,
            questTitle: uq.quest.title,
            rewards: {
              coins: uq.quest.rewardCoins,
              gems: uq.quest.rewardGems,
              xp: uq.quest.rewardXp,
              affection: uq.quest.rewardAffection,
            },
          });
        }
      }
    }

    // Execute batch updates in a single transaction
    if (batchUpdates.length > 0) {
      await prisma.$transaction(
        batchUpdates.map((update) =>
          prisma.userQuest.update({
            where: { id: update.id },
            data: {
              progress: update.progress,
              status: update.isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
              completedAt: update.isCompleted ? new Date() : null,
            },
          })
        )
      );
    }

    return { updated, completed };
  },

  /**
   * Auto-claim a completed quest and distribute rewards
   */
  async autoClaimQuest(userId: string, questId: string, _depth: number = 0): Promise<void> {
    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });

    if (!userQuest || userQuest.status !== 'COMPLETED') {
      return;
    }

    const quest = userQuest.quest;

    // Update to claimed
    await prisma.userQuest.update({
      where: { id: userQuest.id },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date(),
      },
    });

    // Give rewards to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: quest.rewardCoins },
        gems: { increment: quest.rewardGems },
      },
    });

    // Update character
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (character) {
      if (quest.rewardXp > 0) {
        await characterService.addExperience(character.id, quest.rewardXp);
      }
      if (quest.rewardAffection > 0) {
        await characterService.updateAffection(character.id, quest.rewardAffection);
      }
    }

    // Process COMPLETE_QUEST action for meta-quests
    await this.processAction({
      userId,
      characterId: character?.id,
      action: 'COMPLETE_QUEST',
      metadata: { questId, questType: quest.type },
    }, _depth + 1);
  },

  /**
   * Check and unlock milestones, create memories
   */
  async checkMilestones(
    userId: string,
    characterId: string,
    action: GameAction,
    metadata?: Record<string, unknown>
  ): Promise<{ unlocked: string[]; memories: string[] }> {
    const unlocked: string[] = [];
    const memories: string[] = [];

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, affection: true, level: true, userId: true, relationshipStage: true },
    });

    if (!character) return { unlocked, memories };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, streak: true },
    });

    if (!user) return { unlocked, memories };

    // Get user stats in parallel (batch instead of sequential)
    // Use Redis counters with DB fallback to avoid expensive COUNT(*)
    const msgCounterKey = `milestone_msg_count:${userId}`;
    const giftCounterKey = `milestone_gift_count:${userId}`;
    const [cachedMsgCount, cachedGiftCount] = await Promise.all([
      cache.get<number>(msgCounterKey),
      cache.get<number>(giftCounterKey),
    ]);
    let messageCount: number;
    let giftCount: number;
    if (cachedMsgCount !== null && cachedGiftCount !== null) {
      messageCount = cachedMsgCount;
      giftCount = cachedGiftCount;
    } else {
      // Fallback: full COUNT, then cache for 1 hour
      [messageCount, giftCount] = await Promise.all([
        prisma.message.count({ where: { userId, role: 'USER' } }),
        prisma.giftHistory.count({ where: { userId } }),
      ]);
      await Promise.all([
        cache.set(msgCounterKey, messageCount, 3600),
        cache.set(giftCounterKey, giftCount, 3600),
      ]);
    }

    // Check various milestones
    const milestonesToCheck: { type: MilestoneType; condition: boolean; title: string; description: string }[] = [
      {
        type: 'FIRST_CHAT',
        condition: action === 'SEND_MESSAGE' && messageCount === 1,
        title: 'Cuộc trò chuyện đầu tiên',
        description: `Lần đầu tiên bạn và ${character.name} trò chuyện cùng nhau.`,
      },
      {
        type: 'FIRST_GIFT',
        condition: action === 'SEND_GIFT' && giftCount === 1,
        title: 'Món quà đầu tiên',
        description: `Bạn đã tặng ${character.name} món quà đầu tiên!`,
      },
      {
        type: 'AFFECTION_100',
        condition: character.affection >= 100,
        title: 'Tình cảm nảy nở',
        description: `Mối quan hệ với ${character.name} đang phát triển tốt đẹp.`,
      },
      {
        type: 'AFFECTION_500',
        condition: character.affection >= 500,
        title: 'Người bạn thân',
        description: `${character.name} giờ đây là người bạn thân thiết của bạn.`,
      },
      {
        type: 'AFFECTION_1000',
        condition: character.affection >= 1000,
        title: 'Tình yêu đích thực',
        description: `Bạn và ${character.name} đã có một tình yêu sâu đậm.`,
      },
      {
        type: 'MESSAGES_100',
        condition: messageCount === 100,
        title: '100 tin nhắn',
        description: `Bạn và ${character.name} đã trao đổi 100 tin nhắn!`,
      },
      {
        type: 'MESSAGES_500',
        condition: messageCount === 500,
        title: 'Người bạn chuyện trò',
        description: `500 tin nhắn - những cuộc trò chuyện không bao giờ kết thúc!`,
      },
      {
        type: 'GIFTS_10',
        condition: giftCount === 10,
        title: 'Người hào phóng',
        description: `Bạn đã tặng ${character.name} 10 món quà!`,
      },
      {
        type: 'STREAK_7_DAYS',
        condition: user.streak === 7,
        title: 'Một tuần bên nhau',
        description: `7 ngày liên tiếp trò chuyện với ${character.name}!`,
      },
      {
        type: 'STREAK_30_DAYS',
        condition: user.streak === 30,
        title: 'Một tháng yêu thương',
        description: `30 ngày bên nhau - tình cảm thật sự!`,
      },
      {
        type: 'GIFTS_50',
        condition: giftCount === 50,
        title: 'Người phóng khoáng',
        description: `Bạn đã tặng ${character.name} 50 món quà!`,
      },
      {
        type: 'RELATIONSHIP_FRIEND',
        condition: character.relationshipStage === 'FRIEND',
        title: 'Trở thành bạn bè',
        description: `Bạn và ${character.name} đã trở thành bạn bè thân!`,
      },
      {
        type: 'RELATIONSHIP_LOVER',
        condition: character.relationshipStage === 'LOVER',
        title: 'Người yêu',
        description: `Bạn và ${character.name} chính thức trở thành người yêu!`,
      },
      {
        type: 'LEVEL_UP',
        condition: action === 'REACH_AFFECTION_LEVEL',
        title: `Lên cấp ${character.level}`,
        description: `${character.name} đã đạt cấp độ ${character.level}!`,
      },
    ];

    // Batch-load all existing milestones for this user (single query)
    const existingMilestones = await prisma.memory.findMany({
      where: {
        userId,
        type: 'MILESTONE',
      },
      select: { milestone: true },
    });
    const existingMilestoneTypes = new Set(existingMilestones.map((m) => m.milestone));

    // Filter milestones that are triggered AND not yet unlocked
    const newMilestones = milestonesToCheck.filter(
      (m) => m.condition && !existingMilestoneTypes.has(m.type)
    );

    // Create all new milestone memories and give rewards in parallel
    await Promise.all(
      newMilestones.map(async (milestone) => {
        const memory = await prisma.memory.create({
          data: {
            userId,
            characterId,
            type: 'MILESTONE',
            title: milestone.title,
            description: milestone.description,
            milestone: milestone.type,
            metadata: {
              milestoneType: milestone.type,
              unlockedAt: new Date().toISOString(),
            },
          },
        });

        unlocked.push(milestone.type);
        memories.push(memory.id);

        await this.giveMilestoneReward(userId, characterId, milestone.type);
      })
    );

    return { unlocked, memories };
  },

  /**
   * Give bonus rewards for unlocking milestones
   */
  async giveMilestoneReward(userId: string, characterId: string, milestoneType: MilestoneType): Promise<void> {
    const rewards: Record<MilestoneType, { coins: number; gems: number; affection: number }> = {
      'FIRST_CHAT': { coins: 50, gems: 5, affection: 10 },
      'FIRST_GIFT': { coins: 100, gems: 10, affection: 20 },
      'AFFECTION_100': { coins: 200, gems: 20, affection: 0 },
      'AFFECTION_500': { coins: 500, gems: 50, affection: 0 },
      'AFFECTION_1000': { coins: 1000, gems: 100, affection: 0 },
      'RELATIONSHIP_FRIEND': { coins: 300, gems: 30, affection: 50 },
      'RELATIONSHIP_LOVER': { coins: 500, gems: 50, affection: 100 },
      'STREAK_7_DAYS': { coins: 200, gems: 20, affection: 30 },
      'STREAK_30_DAYS': { coins: 1000, gems: 100, affection: 100 },
      'MESSAGES_100': { coins: 150, gems: 15, affection: 20 },
      'MESSAGES_500': { coins: 500, gems: 50, affection: 50 },
      'GIFTS_10': { coins: 200, gems: 20, affection: 30 },
      'GIFTS_50': { coins: 500, gems: 50, affection: 100 },
      'LEVEL_UP': { coins: 100, gems: 10, affection: 0 },
    };

    const reward = rewards[milestoneType];
    if (!reward) return;

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: reward.coins },
        gems: { increment: reward.gems },
      },
    });

    // Update character affection
    if (reward.affection > 0) {
      await characterService.updateAffection(characterId, reward.affection);
    }
  },

  /**
   * Update user stats (streak, last active, etc.)
   * Debounced: only checks new day logic once per minute via Redis
   */
  async updateUserStats(userId: string, action: GameAction): Promise<void> {
    // Debounce: skip if we checked within the last 60 seconds
    const debounceKey = `user_stats_check:${userId}`;
    const recentlyChecked = await cache.get<boolean>(debounceKey);
    
    if (recentlyChecked) {
      // Just update lastActiveAt (cheap operation)
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, streak: true, lastActiveAt: true },
    });

    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
    const lastActiveDay = lastActive
      ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate())
      : null;

    // Check if this is first activity today
    const isNewDay = !lastActiveDay || today.getTime() > lastActiveDay.getTime();

    if (isNewDay) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const streakContinues = lastActiveDay && lastActiveDay.getTime() === yesterday.getTime();

      await prisma.user.update({
        where: { id: userId },
        data: {
          streak: streakContinues ? { increment: 1 } : 1,
          lastActiveAt: now,
        },
      });

      // Process daily login action (only on new day, not recursively)
      if (action !== 'DAILY_LOGIN') {
        await this.processAction({ userId, action: 'DAILY_LOGIN' }, MAX_RECURSION_DEPTH - 1);
      }
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: now },
      });
    }

    // Set debounce flag for 60 seconds
    await cache.set(debounceKey, true, 60);
  },

  /**
   * Create a special memory for an event
   */
  async createEventMemory(
    userId: string,
    characterId: string,
    title: string,
    description: string,
    type: 'CHAT' | 'GIFT' | 'MILESTONE' | 'SPECIAL' | 'DATE' = 'SPECIAL',
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const memory = await prisma.memory.create({
      data: {
        userId,
        characterId,
        type: type as any,
        title,
        description,
        metadata: (metadata || undefined) as any,
      },
    });

    return memory.id;
  },

  /**
   * Get today's progress summary for a user
   */
  async getDailyProgress(userId: string): Promise<{
    questsCompleted: number;
    totalQuests: number;
    messagesSent: number;
    giftsSent: number;
    streak: number;
    coinsEarned: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all independent queries in parallel
    const [user, completedQuests, totalDailyQuests, messagesSent, giftsSent] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true },
      }),
      prisma.userQuest.count({
        where: {
          userId,
          status: { in: ['COMPLETED', 'CLAIMED'] },
          completedAt: { gte: today },
        },
      }),
      prisma.quest.count({
        where: { type: 'DAILY', isActive: true },
      }),
      prisma.message.count({
        where: {
          userId,
          role: 'USER',
          createdAt: { gte: today },
        },
      }),
      prisma.giftHistory.count({
        where: {
          userId,
          createdAt: { gte: today },
        },
      }),
    ]);

    return {
      questsCompleted: completedQuests,
      totalQuests: totalDailyQuests,
      messagesSent,
      giftsSent,
      streak: user?.streak || 0,
      coinsEarned: 0, // TODO: Track daily earnings
    };
  },
};
