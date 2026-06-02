import { GiftHistorySource, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { cache, CacheKeys } from '../../lib/redis';
import { characterService } from '../character/character.service';

type TxClient = Prisma.TransactionClient;

export interface GiftGrantInput {
  giftId: string;
  quantity: number;
}

export interface RewardGrantInput {
  userId: string;
  source: GiftHistorySource;
  sourceRefId?: string | null;
  coins?: number;
  gems?: number;
  xp?: number;
  affection?: number;
  gifts?: GiftGrantInput[];
  message?: string;
  notificationTitle?: string;
  skipNotification?: boolean;
}

export interface RewardGrantResult {
  coins: number;
  gems: number;
  xp: number;
  affection: number;
  gifts: Array<{
    giftId: string;
    name: string;
    quantity: number;
    delivery: 'DIRECT' | 'INVENTORY';
    characterId: string | null;
  }>;
  directDelivered: number;
  inventoryFallback: number;
  characterId: string | null;
}

function positiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function normalizeGifts(gifts?: GiftGrantInput[]) {
  const byGift = new Map<string, number>();
  for (const gift of gifts || []) {
    const quantity = positiveInt(gift.quantity);
    if (!gift.giftId || quantity <= 0) continue;
    byGift.set(gift.giftId, (byGift.get(gift.giftId) || 0) + quantity);
  }
  return Array.from(byGift.entries()).map(([giftId, quantity]) => ({ giftId, quantity }));
}

async function getActiveCharacter(userId: string, client: TxClient) {
  return client.character.findFirst({
    where: { userId, isActive: true, isEnded: false, isExPersona: false },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
}

export async function grantRewards(
  input: RewardGrantInput,
  client: TxClient = prisma,
): Promise<RewardGrantResult> {
  const coins = positiveInt(input.coins);
  const gems = positiveInt(input.gems);
  const xp = positiveInt(input.xp);
  const affection = positiveInt(input.affection);
  const gifts = normalizeGifts(input.gifts);

  if (coins > 0 || gems > 0) {
    await client.user.update({
      where: { id: input.userId },
      data: {
        ...(coins > 0 && { coins: { increment: coins } }),
        ...(gems > 0 && { gems: { increment: gems } }),
      },
    });
  }

  const character = gifts.length > 0 || xp > 0 || affection > 0
    ? await getActiveCharacter(input.userId, client)
    : null;

  const giftIds = gifts.map((gift) => gift.giftId);
  const giftRows = giftIds.length > 0
    ? await client.gift.findMany({
        where: { id: { in: giftIds }, isActive: true },
        select: { id: true, name: true, affectionBonus: true },
      })
    : [];
  const giftById = new Map(giftRows.map((gift) => [gift.id, gift]));

  const grantedGifts: RewardGrantResult['gifts'] = [];
  let directDelivered = 0;
  let inventoryFallback = 0;
  let giftAffection = 0;

  for (const gift of gifts) {
    const giftRow = giftById.get(gift.giftId);
    if (!giftRow) continue;

    if (character) {
      await client.giftHistory.create({
        data: {
          userId: input.userId,
          characterId: character.id,
          giftId: gift.giftId,
          quantity: gift.quantity,
          message: input.message || null,
          reaction: null,
          source: input.source,
          sourceRefId: input.sourceRefId || null,
        },
      });
      directDelivered += gift.quantity;
      giftAffection += giftRow.affectionBonus * gift.quantity;
      grantedGifts.push({
        giftId: gift.giftId,
        name: giftRow.name,
        quantity: gift.quantity,
        delivery: 'DIRECT',
        characterId: character.id,
      });
    } else {
      await client.userGift.upsert({
        where: { userId_giftId: { userId: input.userId, giftId: gift.giftId } },
        update: { quantity: { increment: gift.quantity } },
        create: { userId: input.userId, giftId: gift.giftId, quantity: gift.quantity },
      });
      inventoryFallback += gift.quantity;
      grantedGifts.push({
        giftId: gift.giftId,
        name: giftRow.name,
        quantity: gift.quantity,
        delivery: 'INVENTORY',
        characterId: null,
      });
    }
  }

  if (!input.skipNotification && (coins > 0 || gems > 0 || grantedGifts.length > 0)) {
    await client.notification.create({
      data: {
        userId: input.userId,
        type: NotificationType.REWARD,
        title: input.notificationTitle || 'Phần thưởng',
        message: input.message || 'Bạn đã nhận được phần thưởng.',
        data: {
          source: input.source,
          sourceRefId: input.sourceRefId || null,
          coins,
          gems,
          gifts: grantedGifts,
        },
      },
    });
  }

  await cache.del(CacheKeys.giftInventory(input.userId));

  const appliedAffection = character ? affection + giftAffection : 0;

  return {
    coins,
    gems,
    xp,
    affection: appliedAffection,
    gifts: grantedGifts,
    directDelivered,
    inventoryFallback,
    characterId: character?.id ?? null,
  };
}

export async function applyCharacterRewardEffects(userId: string, result: RewardGrantResult) {
  if (!result.characterId) return;
  if (result.xp > 0) await characterService.addExperience(result.characterId, result.xp, userId);
  if (result.affection > 0) await characterService.updateAffection(result.characterId, result.affection, userId);
}
