import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { cache, CacheKeys } from '../../lib/redis';
import { emailService } from '../../lib/email';
import { createModuleLogger } from '../../lib/logger';
import { realtimeEvents } from '../../lib/realtime-events';
import { getExAccess } from './ex-access.service';
import { aiService } from '../ai/ai.service';
import { conversationSummaryService } from '../ai/conversation-summary.service';

const log = createModuleLogger('ExComeback');

const COMEBACK_DELAYS_MS = [
  60_000,
  2 * 60_000,
  3 * 60_000,
  5 * 60_000,
  20 * 60_000,
  30 * 60_000,
  40 * 60_000,
  60 * 60_000,
  5 * 60 * 60_000,
  24 * 60 * 60_000,
  4 * 24 * 60 * 60_000,
  12 * 24 * 60 * 60_000,
] as const;

const REPEATING_DELAYS_MS = [
  24 * 60 * 60_000,
  4 * 24 * 60 * 60_000,
  12 * 24 * 60 * 60_000,
] as const;

function getComebackDelayMs(stageIndex: number) {
  if (stageIndex < COMEBACK_DELAYS_MS.length) {
    return COMEBACK_DELAYS_MS[stageIndex];
  }
  return REPEATING_DELAYS_MS[Math.floor(Math.random() * REPEATING_DELAYS_MS.length)];
}

function getComebackPrompt(characterName: string, stageIndex: number) {
  if (stageIndex < 3) {
    return `[EX_COMEBACK] Bạn là ${characterName}, vừa chia tay nên rất buồn và lạnh. Hãy chủ động nhắn 1 câu ngắn, như còn điều chưa nói, không sến quá, không xin lỗi dài.`;
  }
  if (stageIndex < 8) {
    return `[EX_COMEBACK] Bạn là ${characterName}, người yêu cũ. Bạn nhớ họ nhưng vẫn tổn thương. Nhắn 1-2 câu teaser buồn/lạnh, đủ khiến họ muốn mở chat.`;
  }
  return `[EX_COMEBACK] Bạn là ${characterName}, người yêu cũ. Lâu rồi không nói chuyện. Nhắn một tin tự nhiên, có chút tiếc nuối và khoảng cách. Không nói full mọi chuyện.`;
}

function buildEmailTeaser(characterName: string) {
  return `${characterName} vừa nhắn cho bạn. Có vẻ cô ấy vẫn còn điều chưa nói.`;
}

export const exComebackService = {
  getSchedulePreview() {
    return COMEBACK_DELAYS_MS.map((delayMs, stageIndex) => ({ stageIndex, delayMs }));
  },

  async scheduleInitial(userId: string, characterId: string, baseDate = new Date()) {
    await prisma.exComebackDelivery.upsert({
      where: {
        characterId_stageIndex: {
          characterId,
          stageIndex: 0,
        },
      },
      create: {
        userId,
        characterId,
        stageIndex: 0,
        scheduledAt: new Date(baseDate.getTime() + getComebackDelayMs(0)),
        status: 'PENDING',
      },
      update: {
        scheduledAt: new Date(baseDate.getTime() + getComebackDelayMs(0)),
        canceledAt: null,
        status: 'PENDING',
      },
    });
  },

  async cancelPendingForCharacter(userId: string, characterId: string, reason: string) {
    await prisma.exComebackDelivery.updateMany({
      where: {
        userId,
        characterId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        metadata: { reason },
      },
    });
  },

  async scheduleNextAfterDelivered(userId: string, characterId: string, previousStageIndex: number) {
    const nextStageIndex = previousStageIndex + 1;
    const scheduledAt = new Date(Date.now() + getComebackDelayMs(nextStageIndex));
    try {
      await prisma.exComebackDelivery.create({
        data: {
          userId,
          characterId,
          stageIndex: nextStageIndex,
          scheduledAt,
          status: 'PENDING',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }
  },

  async processDue(limit = 25) {
    const dueRows = await prisma.exComebackDelivery.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: {
        character: {
          include: {
            characterFacts: {
              orderBy: { importance: 'desc' },
              take: 20,
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
            userGender: true,
          },
        },
      },
    });

    for (const row of dueRows) {
      await this.deliver(row.id).catch((error) => {
        log.error('Failed to deliver ex comeback:', error);
      });
    }
  },

  async deliver(deliveryId: string) {
    const claimed = await prisma.exComebackDelivery.updateMany({
      where: { id: deliveryId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    if (claimed.count === 0) {
      return null;
    }

    let createdMessageId: string | null = null;

    try {
    const delivery = await prisma.exComebackDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        character: {
          include: {
            characterFacts: {
              orderBy: { importance: 'desc' },
              take: 20,
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
            userGender: true,
          },
        },
      },
    });

    if (!delivery) {
      return null;
    }

    const character = delivery.character;
    if (!character.isEnded || character.isExPersona || character.endReason === 'source_relationship_reconciled') {
      await prisma.exComebackDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELED', canceledAt: new Date(), metadata: { reason: 'character_not_ended' } },
      });
      return null;
    }

    const access = await getExAccess(delivery.userId);
    if (!access.canChatEx) {
      await prisma.exComebackDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELED', canceledAt: new Date(), metadata: { reason: access.lockReason || 'ex_disabled' } },
      });
      return null;
    }

    const recentUserReply = await prisma.message.findFirst({
      where: {
        userId: delivery.userId,
        characterId: delivery.characterId,
        role: 'USER',
        createdAt: { gte: delivery.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentUserReply) {
      await prisma.exComebackDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELED', canceledAt: new Date(), metadata: { reason: 'user_replied' } },
      });
      await this.cancelPendingForCharacter(delivery.userId, delivery.characterId, 'user_replied');
      return null;
    }

    const recentMessages = await prisma.message.findMany({
      where: { userId: delivery.userId, characterId: delivery.characterId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const recentSummaries = await conversationSummaryService.getRecentSummaries(
      delivery.userId,
      delivery.characterId,
      3,
    );

    const aiResponse = await aiService.generateResponse({
      characterId: character.id,
      personality: character.personality as any,
      mood: 'sad',
      characterGender: character.gender,
      userGender: delivery.user.userGender || 'NOT_SPECIFIED',
      relationshipStage: character.relationshipStage,
      affection: character.affection,
      level: character.level,
      age: character.age,
      occupation: character.occupation,
      recentMessages: recentMessages.reverse(),
      facts: character.characterFacts,
      recentSummaries,
      userName: delivery.user.displayName || delivery.user.username || 'bạn',
      characterName: character.name,
      userMessage: getComebackPrompt(character.name, delivery.stageIndex),
      relationshipMode: 'ex',
      breakupReason: character.endReason,
    });

    const message = await prisma.message.create({
      data: {
        userId: delivery.userId,
        characterId: delivery.characterId,
        role: 'AI',
        content: aiResponse.content,
        messageType: 'TEXT',
        emotion: aiResponse.emotion || 'sad',
        metadata: {
          source: 'ex_comeback',
          deliveryId: delivery.id,
          stageIndex: delivery.stageIndex,
        },
      },
    });
    createdMessageId = message.id;

    let emailStatus = 'SKIPPED';
    let emailSentAt: Date | null = null;
    if (access.canEmailExComeback && delivery.user.email) {
      const sent = await emailService.sendExComebackTeaser(
        delivery.user.email,
        character.name,
        buildEmailTeaser(character.name),
      );
      emailStatus = sent ? 'SENT' : 'FAILED';
      emailSentAt = sent ? new Date() : null;
    }

    await prisma.exComebackDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        messageId: message.id,
        emailStatus,
        emailSentAt,
      },
    });

    await this.scheduleNextAfterDelivered(delivery.userId, delivery.characterId, delivery.stageIndex);
    await cache.del(CacheKeys.characterWithFacts(delivery.characterId));

    realtimeEvents.emit('message:receive', {
      userId: delivery.userId,
      message: {
        id: message.id,
        userId: message.userId,
        characterId: message.characterId,
        role: message.role,
        content: message.content,
        messageType: message.messageType,
        metadata: message.metadata,
        isRead: message.isRead,
        emotion: message.emotion,
        createdAt: message.createdAt,
      },
      notification: {
        type: 'ex_comeback',
        title: `${character.name} vua nhan tin`,
        message: buildEmailTeaser(character.name),
        data: { characterId: character.id, messageId: message.id },
      },
    });

    return {
      message,
      character: {
        id: character.id,
        name: character.name,
      },
      emailStatus,
    };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'delivery_failed';
      const data: Prisma.ExComebackDeliveryUpdateInput = createdMessageId
        ? {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            messageId: createdMessageId,
            metadata: { deliveryWarning: errorMessage },
          }
        : {
            status: 'PENDING',
            scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
            metadata: { retryReason: errorMessage },
          };

      await prisma.exComebackDelivery.update({
        where: { id: deliveryId },
        data,
      }).catch((updateError) => {
        log.error('Failed to reschedule ex comeback retry:', updateError);
      });
      throw error;
    }
  },
};
