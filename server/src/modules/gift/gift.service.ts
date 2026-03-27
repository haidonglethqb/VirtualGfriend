import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { characterService } from '../character/character.service';
import { aiService } from '../ai/ai.service';
import { gameEventService } from '../game/game-event.service';

interface BuyGiftData {
  giftId: string;
  quantity: number;
  paymentMethod: 'coins' | 'gems';
}

interface SendGiftData {
  characterId: string;
  giftId: string;
  message?: string;
}

export const giftService = {
  async getGifts(category?: string) {
    return cache.getOrSet(
      CacheKeys.gifts(category),
      () => prisma.gift.findMany({
        where: {
          isActive: true,
          ...(category && { category }),
        },
        orderBy: [{ rarity: 'asc' }, { sortOrder: 'asc' }],
      }),
      CacheTTL.GIFTS
    );
  },

  async getInventory(userId: string) {
    return cache.getOrSet(
      CacheKeys.giftInventory(userId),
      () => prisma.userGift.findMany({
        where: { userId, quantity: { gt: 0 } },
        include: { gift: true },
        orderBy: { updatedAt: 'desc' },
      }),
      CacheTTL.INVENTORY
    );
  },

  async buyGift(userId: string, data: BuyGiftData) {
    const gift = await prisma.gift.findUnique({
      where: { id: data.giftId },
    });

    if (!gift) {
      throw new AppError('Gift not found', 404, 'GIFT_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const price = data.paymentMethod === 'coins' ? gift.priceCoins : gift.priceGems;
    if (data.quantity < 1 || data.quantity > 9999) {
      throw new AppError('Invalid quantity', 400, 'INVALID_QUANTITY');
    }
    const totalPrice = price * data.quantity;
    const userBalance = data.paymentMethod === 'coins' ? user.coins : user.gems;

    if (userBalance < totalPrice) {
      throw new AppError(
        `Not enough ${data.paymentMethod}`,
        400,
        'INSUFFICIENT_BALANCE'
      );
    }

    // Use transaction for atomicity — balance check inside transaction via WHERE clause
    const result = await prisma.$transaction(async (tx) => {
      // Atomically deduct balance only if sufficient funds
      const balanceField = data.paymentMethod;
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          [balanceField]: { gte: totalPrice },
        },
        data: {
          [balanceField]: { decrement: totalPrice },
        },
      });

      if (updated.count === 0) {
        throw new AppError(
          `Not enough ${data.paymentMethod}`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }

      // Add to inventory
      const userGift = await tx.userGift.upsert({
        where: { userId_giftId: { userId, giftId: data.giftId } },
        update: { quantity: { increment: data.quantity } },
        create: { userId, giftId: data.giftId, quantity: data.quantity },
        include: { gift: true },
      });

      return userGift;
    });

    // Invalidate inventory cache
    await cache.del(CacheKeys.giftInventory(userId));

    return {
      purchase: {
        gift: result.gift,
        quantity: data.quantity,
        totalPrice,
        paymentMethod: data.paymentMethod,
      },
      newBalance: userBalance - totalPrice,
    };
  },

  async sendGift(userId: string, data: SendGiftData) {
    // Check character ownership
    const character = await prisma.character.findFirst({
      where: { id: data.characterId, userId },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    // Check inventory
    const userGift = await prisma.userGift.findUnique({
      where: { userId_giftId: { userId, giftId: data.giftId } },
      include: { gift: true },
    });

    if (!userGift || userGift.quantity < 1) {
      throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
    }

    const gift = userGift.gift;

    // Generate AI reaction for gift (with fallback)
    let reaction: string;
    try {
      const aiResponse = await aiService.generateResponse({
        characterId: data.characterId,
        personality: character.personality as any,
        mood: (character.mood || 'happy') as any,
        relationshipStage: character.relationshipStage,
        affection: character.affection,
        level: character.level,
        age: character.age,
        occupation: character.occupation || 'student',
        recentMessages: [],
        facts: [],
        userName: '',
        characterName: character.name,
        userMessage: `[SYSTEM: User just gifted you "${gift.name}" (${gift.description || 'a special gift'}). React naturally and sweetly in 1-2 short Vietnamese sentences. Express gratitude in your unique personality.]`,
      });
      reaction = aiResponse.content;
    } catch {
      reaction = `Wow! ${gift.name}! Cảm ơn em nhiều lắm! 💕`;
    }

    // Use transaction for atomicity - all or nothing
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from inventory
      await tx.userGift.update({
        where: { id: userGift.id },
        data: { quantity: { decrement: 1 } },
      });

      // Record gift history
      await tx.giftHistory.create({
        data: {
          userId,
          characterId: data.characterId,
          giftId: data.giftId,
          message: data.message,
          reaction,
        },
      });

      // Save as message
      await tx.message.create({
        data: {
          userId,
          characterId: data.characterId,
          role: 'SYSTEM',
          content: `Bạn đã tặng ${gift.name}`,
          messageType: 'GIFT',
          metadata: { giftId: data.giftId, giftName: gift.name },
        },
      });

      await tx.message.create({
        data: {
          userId,
          characterId: data.characterId,
          role: 'AI',
          content: reaction,
          messageType: 'TEXT',
          emotion: 'love',
        },
      });

      return { success: true };
    });

    // Update affection (outside transaction as it has its own logic)
    const updatedCharacter = await characterService.updateAffection(data.characterId, gift.affectionBonus);

    // Invalidate caches
    await cache.del(CacheKeys.giftInventory(userId));
    await cache.del(CacheKeys.characterWithFacts(data.characterId));

    // Process game event for quest progress and milestones
    const gameResult = await gameEventService.processAction({
      userId,
      characterId: data.characterId,
      action: 'SEND_GIFT',
      metadata: { giftId: data.giftId, giftName: gift.name },
    });

    return {
      gift,
      reaction,
      affectionGained: gift.affectionBonus,
      newAffection: updatedCharacter.affection,
      questsCompleted: gameResult.questsCompleted,
      milestonesUnlocked: gameResult.milestonesUnlocked,
    };
  },

  async getGiftHistory(userId: string, page: number, limit: number) {
    const safeLimit = Math.min(Math.max(1, limit), 100); // Cap at 100
    const skip = (page - 1) * safeLimit;

    // Use direct userId filter instead of nested relation filter
    const [history, total] = await Promise.all([
      prisma.giftHistory.findMany({
        where: { userId },
        include: {
          gift: true,
          character: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      prisma.giftHistory.count({ where: { userId } }),
    ]);

    return {
      items: history,
      total,
      page,
      pageSize: safeLimit,
      hasMore: skip + history.length < total,
    };
  },
};
