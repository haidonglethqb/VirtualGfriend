import { prisma, Prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { characterService } from '../character/character.service';
import { aiService } from '../ai/ai.service';
import { gameEventService } from '../game/game-event.service';
import { getTierConfig } from '../admin/tier-config.service';
import { applyCharacterRewardEffects, grantRewards } from '../reward/reward-grant.service';
import { getVipPackSegments as getConfiguredVipPackSegments } from './vip-pack-config.service';
import { assertCanUseExRelationship } from '../character/ex-access.service';
import { exComebackService } from '../character/ex-comeback.service';

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

const TIER_HIERARCHY = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'] as const;
type PremiumTierName = typeof TIER_HIERARCHY[number];
type VipSegment = Exclude<PremiumTierName, 'FREE'>;

const VIP_SEGMENTS_BY_TIER: Record<VipSegment, VipSegment[]> = {
  BASIC: ['BASIC'],
  PRO: ['BASIC', 'PRO'],
  ULTIMATE: ['BASIC', 'PRO', 'ULTIMATE'],
};

function normalizeTier(tier?: string | null): PremiumTierName {
  return TIER_HIERARCHY.includes(tier as PremiumTierName) ? tier as PremiumTierName : 'FREE';
}

function tierIndex(tier?: string | null) {
  return TIER_HIERARCHY.indexOf(normalizeTier(tier));
}

function canAccessTier(userTier: string | null | undefined, requiredTier: string | null | undefined) {
  return tierIndex(userTier) >= tierIndex(requiredTier || 'FREE');
}

function getClaimWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const claimMonth = `${year}-${String(month).padStart(2, '0')}`;
  const nextClaimAt = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const secondsUntilNextClaim = Math.max(0, Math.ceil((nextClaimAt.getTime() - now.getTime()) / 1000));

  return { claimMonth, nextClaimAt, secondsUntilNextClaim };
}

function segmentsForTier(tier: PremiumTierName): VipSegment[] {
  return tier === 'FREE' ? [] : VIP_SEGMENTS_BY_TIER[tier];
}

function isActivePremiumUser(user: {
  isPremium: boolean;
  premiumTier: string;
  premiumExpiresAt: Date | null;
  subscription?: {
    status: string;
    currentPeriodEnd: Date;
  } | null;
}) {
  const tier = normalizeTier(user.premiumTier);
  if (tier === 'FREE' || !user.isPremium) return false;

  const now = new Date();
  if (user.premiumExpiresAt && user.premiumExpiresAt <= now) return false;

  if (!user.subscription) return true;
  return ['ACTIVE', 'TRIALING'].includes(user.subscription.status) &&
    user.subscription.currentPeriodEnd > now;
}

async function getEffectiveUserTier(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      premiumTier: true,
      isPremium: true,
      premiumExpiresAt: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  return {
    user,
    tier: isActivePremiumUser(user) ? normalizeTier(user.premiumTier) : 'FREE' as PremiumTierName,
  };
}

function giftAccessPayload(
  gift: { requiresPremium: boolean; minimumTier: string },
  userTier: PremiumTierName,
  canAccessPremiumGifts: boolean
) {
  const requiredTier = normalizeTier(gift.minimumTier || (gift.requiresPremium ? 'BASIC' : 'FREE'));
  const lacksPremiumFeature = gift.requiresPremium && !canAccessPremiumGifts;
  const lacksTier = !canAccessTier(userTier, requiredTier);
  const isLocked = lacksPremiumFeature || lacksTier;

  return {
    requiredTier,
    isLocked,
    canBuy: !isLocked,
    lockReason: lacksPremiumFeature ? 'VIP_REQUIRED' : lacksTier ? 'TIER_REQUIRED' : null,
  };
}

async function getVipPackSegments(tier: PremiumTierName, claimMonth: string) {
  return getConfiguredVipPackSegments(tier, claimMonth);
}

export const giftService = {
  async getGifts(userId: string, category?: string) {
    const [gifts, { tier }] = await Promise.all([
      cache.getOrSet(
        CacheKeys.gifts(category),
        () => prisma.gift.findMany({
          where: {
            isActive: true,
            ...(category && { category }),
          },
          orderBy: [{ rarity: 'asc' }, { sortOrder: 'asc' }],
        }),
        CacheTTL.GIFTS
      ),
      getEffectiveUserTier(userId),
    ]);
    const tierConfig = await getTierConfig(tier);

    return gifts.map((gift) => ({
      ...gift,
      ...giftAccessPayload(gift, tier, tierConfig.canAccessPremiumGifts),
    }));
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

    const tierUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        premiumTier: true,
        isPremium: true,
        premiumExpiresAt: true,
        coins: true,
        gems: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!tierUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const userTier = isActivePremiumUser(tierUser) ? normalizeTier(tierUser.premiumTier) : 'FREE';
    const tierConfig = await getTierConfig(userTier);

    if (gift.requiresPremium && !tierConfig.canAccessPremiumGifts) {
      throw new AppError('Nâng cấp VIP để mua quà này!', 403, 'PREMIUM_GIFT_REQUIRED');
    }
    if (gift.minimumTier && gift.minimumTier !== 'FREE' && !canAccessTier(userTier, gift.minimumTier)) {
      throw new AppError(`Cần tier ${gift.minimumTier} để mua quà này`, 403, 'TIER_GIFT_REQUIRED');
    }

    const price = data.paymentMethod === 'coins' ? gift.priceCoins : gift.priceGems;
    if (price <= 0) {
      throw new AppError(`Gift cannot be purchased with ${data.paymentMethod}`, 400, 'INVALID_PAYMENT_METHOD');
    }
    const totalPrice = price * data.quantity;

    const result = await prisma.$transaction(async (tx) => {
      const balanceDebit = await tx.user.updateMany({
        where: {
          id: userId,
          ...(data.paymentMethod === 'coins'
            ? { coins: { gte: totalPrice } }
            : { gems: { gte: totalPrice } }),
        },
        data: {
          [data.paymentMethod]: { decrement: totalPrice },
        },
      });

      if (balanceDebit.count === 0) {
        throw new AppError(
          `Not enough ${data.paymentMethod}`,
          400,
          'INSUFFICIENT_BALANCE'
        );
      }

      const userGift = await tx.userGift.upsert({
        where: { userId_giftId: { userId, giftId: data.giftId } },
        update: { quantity: { increment: data.quantity } },
        create: { userId, giftId: data.giftId, quantity: data.quantity },
        include: { gift: true },
      });

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { coins: true, gems: true },
      });

      return { userGift, updatedUser };
    });

    await cache.del(CacheKeys.giftInventory(userId));

    return {
      purchase: {
        gift: result.userGift.gift,
        quantity: data.quantity,
        totalPrice,
        paymentMethod: data.paymentMethod,
      },
      newBalance: data.paymentMethod === 'coins'
        ? (result.updatedUser?.coins ?? 0)
        : (result.updatedUser?.gems ?? 0),
    };
  },

  async sendGift(userId: string, data: SendGiftData) {
    const character = await prisma.character.findFirst({
      where: { id: data.characterId, userId },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    if (character.isEnded && !character.isExPersona) {
      throw new AppError('Use ex gift endpoint for ended relationships', 400, 'EX_GIFT_ENDPOINT_REQUIRED');
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, username: true, userGender: true },
    });

    let reaction = '';
    const result = await prisma.$transaction(async (tx) => {
      const userGift = await tx.userGift.findUnique({
        where: { userId_giftId: { userId, giftId: data.giftId } },
        include: { gift: true },
      });

      if (!userGift || userGift.quantity < 1) {
        throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
      }

      const gift = userGift.gift;
      const sendUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          premiumTier: true,
          isPremium: true,
          premiumExpiresAt: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
      });
      if (!sendUser) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const sendUserTier = isActivePremiumUser(sendUser) ? normalizeTier(sendUser.premiumTier) : 'FREE';
      const sendTierConfig = await getTierConfig(sendUserTier);

      if (gift.requiresPremium && !sendTierConfig.canAccessPremiumGifts) {
        throw new AppError('Nâng cấp VIP để gửi quà này!', 403, 'PREMIUM_GIFT_REQUIRED');
      }
      if (gift.minimumTier && gift.minimumTier !== 'FREE' && !canAccessTier(sendUserTier, gift.minimumTier)) {
        throw new AppError(`Cần tier ${gift.minimumTier} để gửi quà này`, 403, 'TIER_GIFT_REQUIRED');
      }

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

      const updated = await tx.userGift.updateMany({
        where: { id: userGift.id, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });

      if (updated.count === 0) {
        throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
      }

      await tx.giftHistory.create({
        data: {
          userId,
          characterId: data.characterId,
          giftId: data.giftId,
          message: data.message,
          reaction,
        },
      });

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
    const updatedCharacter = await characterService.updateAffection(data.characterId, gift.affectionBonus, userId);

    await cache.del(CacheKeys.giftInventory(userId));
    await cache.del(CacheKeys.characterWithFacts(data.characterId));

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

  async sendExGift(userId: string, data: SendGiftData) {
    const character = await prisma.character.findFirst({
      where: { id: data.characterId, userId, isEnded: true, isExPersona: false },
      include: {
        characterFacts: {
          orderBy: { importance: 'desc' },
          take: 10,
        },
      },
    });

    if (!character) {
      throw new AppError('Ended character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    await assertCanUseExRelationship(userId, 'gift');
    await exComebackService.cancelPendingForCharacter(userId, data.characterId, 'user_sent_ex_gift');

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, username: true, userGender: true },
    });

    let reaction = '';
    const result = await prisma.$transaction(async (tx) => {
      const userGift = await tx.userGift.findUnique({
        where: { userId_giftId: { userId, giftId: data.giftId } },
        include: { gift: true },
      });

      if (!userGift || userGift.quantity < 1) {
        throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
      }

      const gift = userGift.gift;
      const updated = await tx.userGift.updateMany({
        where: { id: userGift.id, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });
      if (updated.count === 0) {
        throw new AppError('Gift not in inventory', 400, 'GIFT_NOT_OWNED');
      }

      try {
        const aiResponse = await aiService.generateResponse({
          characterId: data.characterId,
          personality: character.personality as any,
          mood: 'sad',
          characterGender: character.gender,
          userGender: userProfile?.userGender || 'NOT_SPECIFIED',
          relationshipStage: character.relationshipStage,
          affection: character.affection,
          level: character.level,
          age: character.age,
          occupation: character.occupation || 'student',
          recentMessages: [],
          facts: character.characterFacts,
          userName: userProfile?.displayName || userProfile?.username || 'ban',
          characterName: character.name,
          userMessage: `[EX_GIFT] User gave you "${gift.name}". You are their ex, still sad and cold. React in 1 short Vietnamese sentence. Do not act fully romantic.`,
          relationshipMode: 'ex',
          breakupReason: character.endReason,
        });
        reaction = aiResponse.content;
      } catch {
        reaction = `${gift.name} ha... minh nhan, nhung dung nghi moi thu da binh thuong lai.`;
      }

      await tx.giftHistory.create({
        data: {
          userId,
          characterId: data.characterId,
          giftId: data.giftId,
          message: data.message,
          reaction,
          source: 'EX_GIFT',
        },
      });

      await tx.message.create({
        data: {
          userId,
          characterId: data.characterId,
          role: 'SYSTEM',
          content: `Bạn đã tặng ${gift.name}`,
          messageType: 'GIFT',
          metadata: { giftId: data.giftId, giftName: gift.name, source: 'ex_gift' },
        },
      });

      const aiMessage = await tx.message.create({
        data: {
          userId,
          characterId: data.characterId,
          role: 'AI',
          content: reaction,
          messageType: 'TEXT',
          emotion: 'sad',
          metadata: { source: 'ex_gift', relationshipState: 'ENDED' },
        },
      });

      const affectionGained = Math.max(1, Math.min(5, Math.ceil(gift.affectionBonus * 0.25)));
      const updatedCharacter = await tx.character.update({
        where: { id: character.id },
        data: {
          affection: Math.min(1000, character.affection + affectionGained),
          mood: 'sad',
        },
      });

      return { gift, aiMessage, affectionGained, newAffection: updatedCharacter.affection };
    });

    await cache.del(CacheKeys.giftInventory(userId));
    await cache.del(CacheKeys.characterWithFacts(data.characterId));

    return {
      gift: result.gift,
      reaction,
      affectionGained: result.affectionGained,
      newAffection: result.newAffection,
      aiMessage: result.aiMessage,
      relationshipState: 'ENDED',
      reconcileAvailable: result.newAffection >= 700,
      reconcileThreshold: 700,
      questsCompleted: [],
      milestonesUnlocked: [],
    };
  },

  async getGiftHistory(userId: string, page: number, limit: number) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (page - 1) * safeLimit;

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

  async getVipPackStatus(userId: string) {
    const { claimMonth, nextClaimAt, secondsUntilNextClaim } = getClaimWindow();
    const { user, tier } = await getEffectiveUserTier(userId);
    const eligibleSegments = segmentsForTier(tier);
    const claimedRows = await prisma.vipGiftClaim.findMany({
      where: { userId, claimMonth },
      select: { tier: true, claimedAt: true },
    });
    const claimedSegments = claimedRows.map((row) => row.tier as VipSegment);
    const claimedSet = new Set(claimedSegments);
    const claimableSegments = eligibleSegments.filter((segment) => !claimedSet.has(segment));
    const packSegments = await getVipPackSegments(tier, claimMonth);
    const claimableSet = new Set(claimableSegments);
    const configWarnings = packSegments.flatMap((segment) => segment.warnings);
    const invalidClaimableSegments = new Set(
      configWarnings
        .filter((warning) => claimableSet.has(warning.segment))
        .map((warning) => warning.segment),
    );
    const packPreview = packSegments.map(({ segment, items, config, warnings }) => ({
      segment,
      config,
      items,
      quantity: items[0]?.quantity ?? 0,
      gift: items[0]?.gift ?? null,
      warnings,
      isClaimable: claimableSet.has(segment),
      claimedAt: claimedRows.find((row) => row.tier === segment)?.claimedAt ?? null,
    }));
    const isEligible = isActivePremiumUser(user);
    const validClaimableSegments = claimableSegments.filter((segment) => !invalidClaimableSegments.has(segment));

    return {
      tier,
      isEligible,
      canClaim: isEligible && validClaimableSegments.length > 0,
      claimMonth,
      eligibleSegments,
      claimedSegments,
      claimableSegments,
      nextClaimAt,
      secondsUntilNextClaim,
      lockReason: isEligible ? null : 'VIP_REQUIRED',
      configWarnings,
      packPreview,
    };
  },

  async claimVipPack(userId: string) {
    const { claimMonth } = getClaimWindow();
    const { user, tier } = await getEffectiveUserTier(userId);
    if (!isActivePremiumUser(user) || tier === 'FREE') {
      throw new AppError('VIP subscription required to claim this gift pack', 403, 'VIP_REQUIRED');
    }

    const eligibleSegments = segmentsForTier(tier);
    const existingClaims = await prisma.vipGiftClaim.findMany({
      where: { userId, claimMonth },
      select: { tier: true },
    });
    const claimedSet = new Set(existingClaims.map((claim) => claim.tier as VipSegment));
    const claimableSegments = eligibleSegments.filter((segment) => !claimedSet.has(segment));
    if (claimableSegments.length === 0) {
      throw new AppError('VIP gift pack already claimed for this month', 400, 'VIP_GIFT_ALREADY_CLAIMED');
    }

    const packSegments = await getVipPackSegments(tier, claimMonth);
    const packBySegment = new Map(packSegments.map((pack) => [pack.segment, pack]));
    const configWarnings = packSegments
      .filter((pack) => claimableSegments.includes(pack.segment))
      .flatMap((pack) => pack.warnings);
    if (configWarnings.length > 0) {
      throw new AppError('VIP gift pack is not configured correctly', 500, 'VIP_GIFT_CONFIG_INVALID');
    }
    const grants = claimableSegments.map((segment) => {
      const pack = packBySegment.get(segment);
      if (!pack || pack.items.length === 0) {
        throw new AppError('VIP gift pack is not configured correctly', 500, 'VIP_GIFT_CONFIG_INVALID');
      }
      return { segment, items: pack.items };
    });

    let grantResults: Awaited<ReturnType<typeof grantRewards>>[] = [];
    try {
      grantResults = await prisma.$transaction(async (tx) => {
        const results: Awaited<ReturnType<typeof grantRewards>>[] = [];
        for (const grant of grants) {
          const giftGrant = await grantRewards({
            userId,
            source: 'VIP_PACK',
            sourceRefId: `${claimMonth}:${grant.segment}`,
            gifts: grant.items.map((item) => ({
              giftId: item.gift.id,
              quantity: item.quantity,
            })),
            message: 'Bạn đã nhận quà VIP tháng này.',
            notificationTitle: 'Quà VIP',
          }, tx);
          results.push(giftGrant);

          await tx.vipGiftClaim.create({
            data: {
              userId,
              claimMonth,
              tier: grant.segment,
              grantedGifts: giftGrant.gifts,
            },
          });
        }
        return results;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('VIP gift pack already claimed for this month', 400, 'VIP_GIFT_ALREADY_CLAIMED');
      }
      throw error;
    }

    await cache.del(CacheKeys.giftInventory(userId));
    for (const result of grantResults) {
      await applyCharacterRewardEffects(userId, result);
    }

    return {
      claimed: true,
      tier,
      claimMonth,
      claimedSegments: claimableSegments,
      granted: grants.flatMap((grant) => grant.items.map((item) => ({
        segment: grant.segment,
        quantity: item.quantity,
        gift: item.gift,
      }))),
    };
  },
};
