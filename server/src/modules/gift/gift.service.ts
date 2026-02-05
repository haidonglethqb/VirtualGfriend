import { prisma } from '../../lib/prisma';
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
    return prisma.gift.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: [{ rarity: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async getInventory(userId: string) {
    return prisma.userGift.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { gift: true },
      orderBy: { updatedAt: 'desc' },
    });
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
    const totalPrice = price * data.quantity;
    const userBalance = data.paymentMethod === 'coins' ? user.coins : user.gems;

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

    // Generate AI reaction
    const reaction = `Wow! ${gift.name}! Cảm ơn em nhiều lắm!`;

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
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.giftHistory.findMany({
        where: { character: { userId } },
        include: {
          gift: true,
          character: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.giftHistory.count({ where: { character: { userId } } }),
    ]);

    return {
      items: history,
      total,
      page,
      pageSize: limit,
      hasMore: skip + history.length < total,
    };
  },
};
