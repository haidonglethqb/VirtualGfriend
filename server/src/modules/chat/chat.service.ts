import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { aiService } from '../ai/ai.service';
import { factsLearningService } from '../ai/facts-learning.service';
import { conversationSummaryService } from '../ai/conversation-summary.service';
import { autoMemoryService } from '../memory/auto-memory.service';
import { characterService } from '../character/character.service';
import { gameEventService } from '../game/game-event.service';
import { MessageType } from '@prisma/client';
import { createModuleLogger } from '../../lib/logger';
import { MESSAGE_LIMITS } from '../../lib/constants';
import { getTierConfig } from '../admin/tier-config.service';
import type { PremiumTier } from '../../lib/prisma';
import { factQuotaService, type FactSaveResult } from '../character/fact-quota.service';

const log = createModuleLogger('Chat');

// Prompt injection patterns to detect and neutralize
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all|previous|above|prior|existing)\s+(instructions?|rules?|prompts?|directives?|guidelines?)/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\[SYSTEM\]/i,
  /<\|.*?\|>/i,
  /new\s+instructions?\s*:/i,
  /override\s+(your|the)\s+(instructions?|rules?|prompt)/i,
  /disregard\s+(all|previous|above)\s+(instructions?|rules?|prompts?)/i,
  /forget\s+(all|your|previous|everything)\s+(instructions?|rules?|prompts?|context?)/i,
  /from\s+now\s+on\s*,?\s*(you\s+will|your\s+name|your\s+role)/i,
  /dan\s+mode/i,
  /developer\s+mode\s*:/i,
];

// Get start of today in UTC
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Sanitize user message content to neutralize prompt injection attempts.
 * Strips known injection patterns and returns cleaned content.
 */
function sanitizeUserContent(content: string): string {
  let sanitized = content;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  return sanitized;
}

interface SendMessageData {
  characterId: string;
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, unknown>;
  onFactUpdates?: (updates: FactSaveResult & { source: 'ai_inline' | 'ai_batch' }) => void;
}

function isArchivedExPersona(character: {
  isExPersona?: boolean | null
  endReason?: string | null
}) {
  return character.isExPersona && character.endReason === 'source_relationship_reconciled'
}

async function assertExPersonaMessagingAccess(
  userId: string,
  character: { id: string; isExPersona?: boolean | null }
) {
  if (!character.isExPersona) {
    return
  }

  const [user, exPersona] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPremium: true,
        premiumTier: true,
        premiumExpiresAt: true,
        settings: {
          select: {
            allowExPersonaMessages: true,
          },
        },
      },
    }),
    prisma.character.findFirst({
      where: { id: character.id, userId, isExPersona: true },
      select: { id: true, exMessagingEnabled: true },
    }),
  ])

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  if (!exPersona) {
    throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND')
  }

  const tier = user.premiumTier as PremiumTier | null
  const tierConfig = tier ? await getTierConfig(tier) : null
  const premiumActive =
    !!tier &&
    user.isPremium &&
    (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())

  if (!premiumActive || !tierConfig?.canCreateExPersonaOnBreakup) {
    throw new AppError(
      'Ex persona chat requires premium subscription',
      403,
      'EX_PERSONA_PREMIUM_REQUIRED'
    )
  }

  if (user.settings?.allowExPersonaMessages === false) {
    throw new AppError(
      'Ex persona messaging is disabled in privacy settings',
      403,
      'EX_PERSONA_DISABLED'
    )
  }

  if (exPersona.exMessagingEnabled === false) {
    throw new AppError(
      'This ex persona conversation is disabled',
      403,
      'EX_PERSONA_DISABLED'
    )
  }
}

export const chatService = {
  async getHistory(userId: string, characterId: string, page: number, limit: number) {
    const safeLimit = Math.min(Math.max(1, limit), 100); // Cap at 100
    const skip = (page - 1) * safeLimit;

    const where = { userId, characterId };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          character: {
            select: {
              id: true,
              name: true,
              avatarStyle: true,
            },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    return {
      messages: messages.reverse(),
      total,
      page,
      pageSize: safeLimit,
      hasMore: skip + messages.length < total,
    };
  },

  async getCharacterHistory(
    userId: string,
    characterId: string,
    limit: number,
    cursor?: string
  ) {
    // Verify character belongs to user
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    if (isArchivedExPersona(character)) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    if (character.isEnded && !character.isExPersona) {
      throw new AppError('Character is not available for chat', 403, 'CHARACTER_UNAVAILABLE');
    }

    await assertExPersonaMessagingAccess(userId, character)

    const safeLimit = Math.min(Math.max(1, limit), 100); // Cap at 100

    // Use createdAt-based cursor instead of UUID (UUIDs are not sequential)
    let cursorFilter = {};
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        cursorFilter = { createdAt: { lt: cursorDate } };
      }
    }

    const messages = await prisma.message.findMany({
      where: {
        userId,
        characterId,
        ...cursorFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit + 1,
    });

    const hasMore = messages.length > safeLimit;
    if (hasMore) messages.pop();

    // messages are ordered desc: [newest, ..., oldest]
    // nextCursor should be the oldest message's createdAt for "load older" pagination
    const nextCursor = hasMore ? messages[messages.length - 1]?.createdAt?.toISOString() : undefined;

    return {
      messages: messages.reverse(),
      hasMore,
      nextCursor,
    };
  },

  async sendMessage(userId: string, data: SendMessageData) {
    // Sanitize user content to prevent prompt injection
    const sanitizedContent = sanitizeUserContent(data.content);

    // Try to get character from cache first
    const cacheKey = CacheKeys.characterWithFacts(data.characterId);
    let character = await cache.get<any>(cacheKey);

    if (!character) {
      // Cache miss - fetch from database
      character = await prisma.character.findFirst({
        where: { id: data.characterId, userId },
        include: {
          characterFacts: {
            orderBy: { importance: 'desc' },
            take: 20, // Increased from 10 for richer context
          },
        },
      });

      if (character) {
        // Cache for 5 minutes
        await cache.set(cacheKey, character, CacheTTL.INVENTORY);
      }
    }

    // Get user info (this is lightweight, no need to cache)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, username: true, userGender: true },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    if (isArchivedExPersona(character)) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    if (character.isEnded && !character.isExPersona) {
      throw new AppError('Character is not available for chat', 403, 'CHARACTER_UNAVAILABLE');
    }

    await assertExPersonaMessagingAccess(userId, character)

    log.debug('=== SEND MESSAGE START ===');
    log.debug('User:', userId);
    log.debug('Character:', data.characterId);
    log.debug('Content:', sanitizedContent);

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        userId,
        characterId: data.characterId,
        role: 'USER',
        content: sanitizedContent,
        messageType: data.messageType || 'TEXT',
        metadata: data.metadata as object | undefined,
      },
    });
    log.debug('User message saved:', userMessage.id);

    // Keep cached daily count in sync for limit/bonus checks
    await this.incrementDailyCount(userId);

    // Get recent messages for context
    const recentMessages = await prisma.message.findMany({
      where: { userId, characterId: data.characterId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Load recent conversation summaries for long-term AI memory context
    const recentSummaries = await conversationSummaryService.getRecentSummaries(
      userId, data.characterId, 3
    );

    // Generate AI response
    const aiResponse = await aiService.generateResponse({
      characterId: character.id,
      personality: character.personality as 'caring' | 'playful' | 'shy' | 'passionate' | 'intellectual',
      mood: character.mood as 'happy' | 'sad' | 'excited' | 'sleepy' | 'romantic' | 'neutral',
      characterGender: character.gender,
      userGender: user?.userGender || 'NOT_SPECIFIED',
      relationshipStage: character.relationshipStage,
      affection: character.affection,
      level: character.level,
      age: character.age,
      occupation: character.occupation,
      recentMessages: recentMessages.reverse(),
      facts: character.characterFacts,
      recentSummaries,
      userName: user?.displayName || user?.username || 'bạn',
      characterName: character.name,
      userMessage: sanitizedContent,
    });
    log.debug('AI response generated:', aiResponse.content.substring(0, 50));

    let factUpdates: (FactSaveResult & { source: 'ai_inline' | 'ai_batch' }) | undefined;

    // Save inline facts extracted by AI before returning so clients can update counts immediately.
    if (aiResponse.inlineFacts && aiResponse.inlineFacts.length > 0) {
      try {
        const saveResult = await factQuotaService.saveFactsQuotaAware(
          data.characterId,
          aiResponse.inlineFacts.slice(0, 3),
          'ai_inline',
          factsLearningService.calculateImportance,
        );
        factUpdates = { ...saveResult, source: 'ai_inline' };
        if (saveResult.added > 0 || saveResult.updated > 0) {
          log.info('Saved inline facts:', saveResult);
        }
      } catch (err) {
        log.error('Inline facts save error:', err);
      }
    }

    // Save AI message
    const aiMessage = await prisma.message.create({
      data: {
        userId,
        characterId: data.characterId,
        role: 'AI',
        content: aiResponse.content,
        messageType: 'TEXT',
        emotion: aiResponse.emotion,
      },
    });
    log.debug('AI message saved:', aiMessage.id);

    // Update character mood if changed
    if (aiResponse.moodChange) {
      await prisma.character.update({
        where: { id: character.id },
        data: { mood: aiResponse.moodChange },
      });
    }

    // Track level/relationship changes
    let levelUp = false;
    let relationshipUpgrade = false;
    let previousStage = character.relationshipStage;
    let newStage = character.relationshipStage;
    let newLevel = character.level;
    let newAffection = character.affection;
    let unlocks: string[] = [];
    let rewards: { coins?: number; gems?: number; affection?: number } | undefined;

    // Update affection
    if (aiResponse.affectionChange) {
      const affectionResult = await characterService.updateAffection(character.id, aiResponse.affectionChange, userId);
      newAffection = affectionResult.affection;
      if (affectionResult.stageChanged) {
        relationshipUpgrade = true;
        previousStage = affectionResult.previousStage;
        newStage = affectionResult.relationshipStage;
        // Auto-create memory for stage change (background)
        autoMemoryService.createRelationshipStageMemory(userId, data.characterId, newStage)
          .catch(err => log.error('Stage memory error:', err));
      }
      // Check affection milestones (background)
      autoMemoryService.checkAffinityMilestone(userId, data.characterId, character.affection, newAffection)
        .catch(err => log.error('Milestone memory error:', err));
    }

    // Add XP for chatting (with bonuses)
    const user2 = await prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
    const todayMsgCount = await this.getDailyMessageCount(userId);
    const isFirstMessageToday = todayMsgCount === 1;
    const xpBonus = characterService.calculateMessageXpBonus(
      sanitizedContent.length,
      user2?.streak || 0,
      isFirstMessageToday,
    );
    const xpResult = await characterService.addExperience(character.id, xpBonus.total, userId);
    if (xpResult.leveledUp) {
      levelUp = true;
      newLevel = xpResult.newLevel;
      if (xpResult.milestoneReward) {
        unlocks = xpResult.milestoneReward.unlocks;
        rewards = {
          coins: xpResult.milestoneReward.coins,
          gems: xpResult.milestoneReward.gems,
          affection: xpResult.milestoneReward.affection,
        };
      }
      // Auto-create memory for level up (background)
      autoMemoryService.createLevelUpMemory(userId, data.characterId, newLevel)
        .catch(err => log.error('Level up memory error:', err));
    }

    // Invalidate character cache after affection/XP updates
    await cache.del(CacheKeys.characterWithFacts(character.id));

    // Process game event for quest progress and milestones
    const gameResult = await gameEventService.processAction({
      userId,
      characterId: data.characterId,
      action: 'SEND_MESSAGE',
      metadata: { messageId: userMessage.id, content: sanitizedContent },
    });

    // Auto-extract facts from conversation periodically
    // Use Redis counter instead of COUNT(*) to avoid full table scan
    const msgCounterKey = `msg_count:${userId}:${data.characterId}`;
    const cachedCount = await cache.get<number>(msgCounterKey);
    const totalMessages = cachedCount !== null ? cachedCount + 1 : 1;
    await cache.set(msgCounterKey, totalMessages, 604800); // 7-day TTL
    
    if (factsLearningService.shouldExtractFacts(totalMessages)) {
      // Run batch background operations (don't block response)
      factsLearningService.extractAndSaveFacts(data.characterId, recentMessages)
        .then(facts => {
          if (facts.length > 0) log.info('Auto-extracted ' + facts.length + ' facts');
          if (facts.factUpdates) {
            data.onFactUpdates?.({ ...facts.factUpdates, source: 'ai_batch' });
          }
        })
        .catch(err => log.error('Facts extraction error:', err));
      conversationSummaryService.createSummary(userId, data.characterId, recentMessages)
        .catch(err => log.error('Summary creation error:', err));
    }

    log.debug('=== SEND MESSAGE END ===');
    log.debug('Returning:', {
      userMessageId: userMessage.id,
      aiMessageId: aiMessage.id,
      affectionChange: aiResponse.affectionChange,
      levelUp,
      relationshipUpgrade,
      questsCompleted: gameResult.questsCompleted.length,
    });

    return {
      userMessage,
      aiMessage,
      emotion: aiResponse.emotion,
      moodChange: aiResponse.moodChange,
      affectionChange: aiResponse.affectionChange,
      newAffection,
      newLevel,
      levelUp,
      relationshipUpgrade,
      previousStage,
      newStage,
      unlocks,
      rewards,
      questsCompleted: gameResult.questsCompleted,
      milestonesUnlocked: gameResult.milestonesUnlocked,
      factUpdates,
    };
  },

  async deleteMessage(userId: string, messageId: string) {
    const message = await prisma.message.findFirst({
      where: { id: messageId, userId },
    });

    if (!message) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    await prisma.message.delete({
      where: { id: messageId },
    });
  },

  async searchMessages(userId: string, query: string, limit: number) {
    const safeLimit = Math.min(Math.max(1, limit), 50); // Cap at 50
    return prisma.message.findMany({
      where: {
        userId,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      include: {
        character: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  /**
   * Get count of messages sent by user today (USER role only)
   */
  async getDailyMessageCount(userId: string): Promise<number> {
    const startOfToday = getStartOfToday();

    // Try cache first
    const cacheKey = `daily_msg_count:${userId}:${startOfToday.toISOString().split('T')[0]}`;
    const cached = await cache.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Count from database
    const count = await prisma.message.count({
      where: {
        userId,
        role: 'USER',
        createdAt: { gte: startOfToday },
      },
    });

    // Cache for 5 minutes
    await cache.set(cacheKey, count, 300);
    return count;
  },

  /**
   * Check if user can send more messages today based on premium tier
   * Returns { canSend, used, limit, remaining }
   */
  async checkDailyLimit(userId: string, tier: PremiumTier): Promise<{
    canSend: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const config = await getTierConfig(tier);
    const maxMessages = config.maxMessagesPerDay;

    // Unlimited (-1) means no limit
    if (maxMessages === -1) {
      return { canSend: true, used: 0, limit: -1, remaining: -1 };
    }

    const used = await this.getDailyMessageCount(userId);
    const remaining = Math.max(0, maxMessages - used);

    return {
      canSend: used < maxMessages,
      used,
      limit: maxMessages,
      remaining,
    };
  },

  /**
   * Increment daily message count in cache
   */
  async incrementDailyCount(userId: string): Promise<void> {
    const startOfToday = getStartOfToday();
    const cacheKey = `daily_msg_count:${userId}:${startOfToday.toISOString().split('T')[0]}`;

    const current = await cache.get<number>(cacheKey);
    if (current !== null) {
      await cache.incr(cacheKey);
      await cache.expire(cacheKey, 300);
      return;
    }

    const count = await prisma.message.count({
      where: {
        userId,
        role: 'USER',
        createdAt: { gte: startOfToday },
      },
    });

    const initialized = await cache.setNX(cacheKey, count, 300);
    if (initialized) {
      return;
    }

    // Another request warmed the cache first. Keep the higher known count
    // instead of doing a read-modify-write increment that can overshoot.
    const latest = await cache.get<number>(cacheKey);
    if (latest === null || latest < count) {
      await cache.set(cacheKey, count, 300);
    }
  },
};
