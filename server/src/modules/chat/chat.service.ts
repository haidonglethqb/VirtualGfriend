import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { aiService } from '../ai/ai.service';
import { factsLearningService } from '../ai/facts-learning.service';
import { characterService } from '../character/character.service';
import { gameEventService } from '../game/game-event.service';
import { MessageType } from '@prisma/client';
import { createModuleLogger } from '../../lib/logger';
import { MESSAGE_LIMITS } from '../../lib/constants';

const log = createModuleLogger('Chat');

interface SendMessageData {
  characterId: string;
  content: string;
  messageType?: MessageType;
  metadata?: Record<string, unknown>;
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
    // Parallel: verify character + get user info at the same time
    const [character, user] = await Promise.all([
      prisma.character.findFirst({
        where: { id: data.characterId, userId },
        include: {
          characterFacts: {
            orderBy: { importance: 'desc' },
            take: 10,
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, username: true },
      }),
    ]);

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    log.debug('=== SEND MESSAGE START ===');
    log.debug('User:', userId);
    log.debug('Character:', data.characterId);
    log.debug('Content:', data.content);

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        userId,
        characterId: data.characterId,
        role: 'USER',
        content: data.content,
        messageType: data.messageType || 'TEXT',
        metadata: data.metadata as object | undefined,
      },
    });
    log.debug('User message saved:', userMessage.id);

    // Get recent messages for context
    const recentMessages = await prisma.message.findMany({
      where: { userId, characterId: data.characterId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Generate AI response
    const aiResponse = await aiService.generateResponse({
      characterId: character.id,
      personality: character.personality as 'caring' | 'playful' | 'shy' | 'passionate' | 'intellectual',
      mood: character.mood as 'happy' | 'sad' | 'excited' | 'sleepy' | 'romantic' | 'neutral',
      relationshipStage: character.relationshipStage,
      affection: character.affection,
      level: character.level,
      age: character.age,
      occupation: character.occupation,
      recentMessages: recentMessages.reverse(),
      facts: character.characterFacts,
      userName: user?.displayName || user?.username || 'bạn',
      characterName: character.name,
      userMessage: data.content,
    });
    log.debug('AI response generated:', aiResponse.content.substring(0, 50));

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
      const affectionResult = await characterService.updateAffection(character.id, aiResponse.affectionChange);
      newAffection = affectionResult.affection;
      if (affectionResult.stageChanged) {
        relationshipUpgrade = true;
        previousStage = affectionResult.previousStage;
        newStage = affectionResult.relationshipStage;
      }
    }

    // Add XP for chatting
    const xpResult = await characterService.addExperience(character.id, 1);
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
    }

    // Process game event for quest progress and milestones
    const gameResult = await gameEventService.processAction({
      userId,
      characterId: data.characterId,
      action: 'SEND_MESSAGE',
      metadata: { messageId: userMessage.id, content: data.content },
    });

    // Auto-extract facts from conversation periodically
    // Use Redis counter instead of COUNT(*) to avoid full table scan
    const msgCounterKey = `msg_count:${userId}:${data.characterId}`;
    const cachedCount = await cache.get<number>(msgCounterKey);
    const totalMessages = cachedCount !== null ? cachedCount + 1 : 1;
    await cache.set(msgCounterKey, totalMessages, 86400); // 24h TTL
    
    if (factsLearningService.shouldExtractFacts(totalMessages)) {
      // Run in background, don't block response
      factsLearningService.extractAndSaveFacts(data.characterId, recentMessages)
        .then(facts => {
          if (facts.length > 0) {
            log.info('Auto-extracted ' + facts.length + ' facts');
          }
        })
        .catch(err => log.error('Facts extraction error:', err));
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
};
