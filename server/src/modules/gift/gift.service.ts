import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { characterService } from '../character/character.service';
import { aiService } from '../ai/ai.service';
import { gameEventService } from '../game/game-event.service';
import { getTierConfig } from '../admin/tier-config.service';

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

    // Check premium access for premium gifts
    const tierUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { premiumTier: true, coins: true, gems: true },
    });
    const userTier = tierUser?.premiumTier || 'FREE';
    const tierConfig = await getTierConfig(userTier);

    if (gift.requiresPremium && !tierConfig.canAccessPremiumGifts) {
      throw new AppError('Nâng cấp VIP để mua quà này!', 403, 'PREMIUM_GIFT_REQUIRED');
    }
    if (gift.minimumTier && gift.minimumTier !== 'FREE') {
      const TIER_HIERARCHY = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'];
      const userTierIndex = TIER_HIERARCHY.indexOf(userTier);
      const requiredTierIndex = TIER_HIERARCHY.indexOf(gift.minimumTier);
      if (userTierIndex < requiredTierIndex) {
        throw new AppError(`Cần tier ${gift.minimumTier} để mua quà này`, 403, 'TIER_GIFT_REQUIRED');
      }
    }

    if (!tierUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const price = data.paymentMethod === 'coins' ? gift.priceCoins : gift.priceGems;
    const totalPrice = price * data.quantity;
    const userBalance = data.paymentMethod === 'coins' ? tierUser.coins : tierUser.gems;

    if (userBalance < totalPrice) {
      throw new AppError(
        `Not enough ${data.paymentMethod}`,
        400,
        'INSUFFICIENT_BALANCE'
      );
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: {
          [data.paymentMethod]: { decrement: totalPrice },
        },
      });

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

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, username: true, userGender: true },
    });

    // Use transaction with atomic quantity check to prevent double-spend
    let reaction = '';
    const result = await prisma.$transaction(async (tx) => {
      // Load gift and verify ownership inside transaction
      const userGift = await tx.userGift.findUnique({
        where: { userId_giftId: { userId, giftId: data.giftId } },
        include: { gift: true },
      });

      if (!userGift || userGift.quantity < 1) {
        throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
      }

      const gift = userGift.gift;

      // Check premium access for premium gifts
      const sendUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { premiumTier: true },
      });
      const sendUserTier = sendUser?.premiumTier || 'FREE';
      const sendTierConfig = await getTierConfig(sendUserTier);

      if (gift.requiresPremium && !sendTierConfig.canAccessPremiumGifts) {
        throw new AppError('Nâng cấp VIP để gửi quà này!', 403, 'PREMIUM_GIFT_REQUIRED');
      }

      // Generate AI reaction for gift (with fallback)
      try {
        const aiResponse = await aiService.generateResponse({
          characterId: data.characterId,
          personality: character.personality as any,
          mood: (character.mood || 'happy') as any,
          characterGender: character.gender,
          userGender: userProfile?.userGender || 'NOT_SPECIFIED',
          relationshipStage: character.relationshipStage,
          affection: character.affection,
          level: character.level,
          age: character.age,
          occupation: character.occupation || 'student',
          recentMessages: [],
          facts: [],
          userName: userProfile?.displayName || userProfile?.username || 'bạn',
          characterName: character.name,
          userMessage: `[SYSTEM: User just gifted you "${gift.name}" (${gift.description || 'a special gift'}). React naturally and sweetly in 1-2 short Vietnamese sentences. Express gratitude in your unique personality.]`,
        });
        reaction = aiResponse.content;
      } catch {
        reaction = `Wow, ${gift.name} luôn hả? Cảm ơn nhiều nha 💕`;
      }

      // Atomically decrement quantity — concurrent requests: only one will succeed
      const updated = await tx.userGift.updateMany({
        where: { id: userGift.id, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });

      if (updated.count === 0) {
        throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
      }

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

      return { success: true, gift };
    });

    const gift = result.gift;

    // Update affection (outside transaction as it has its own logic)
    const updatedCharacter = await characterService.updateAffection(data.characterId, gift.affectionBonus, userId);

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
