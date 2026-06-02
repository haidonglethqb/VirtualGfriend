import { PremiumTier, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export const TIER_HIERARCHY = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'] as const;
export type PremiumTierName = typeof TIER_HIERARCHY[number];
export type VipSegment = Exclude<PremiumTierName, 'FREE'>;

const VIP_SEGMENTS: VipSegment[] = ['BASIC', 'PRO', 'ULTIMATE'];

const DEFAULT_SEGMENTS: Record<VipSegment, { displayName: string; description: string; sortOrder: number }> = {
  BASIC: {
    displayName: 'VIP Basic Monthly Pack',
    description: 'Quà tháng dành cho VIP Basic',
    sortOrder: 1,
  },
  PRO: {
    displayName: 'VIP Pro Monthly Pack',
    description: 'Quà nâng cấp dành cho VIP Pro',
    sortOrder: 2,
  },
  ULTIMATE: {
    displayName: 'VIP Ultimate Monthly Pack',
    description: 'Quà cao cấp dành cho VIP Ultimate',
    sortOrder: 3,
  },
};

export interface VipPackItemInput {
  giftId: string;
  quantity: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface VipPackSegmentInput {
  segmentTier: VipSegment;
  displayName?: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  items?: VipPackItemInput[];
}

export function normalizeTier(tier?: string | null): PremiumTierName {
  return TIER_HIERARCHY.includes(tier as PremiumTierName) ? tier as PremiumTierName : 'FREE';
}

export function tierIndex(tier?: string | null) {
  return TIER_HIERARCHY.indexOf(normalizeTier(tier));
}

export function segmentsForTier(tier: PremiumTierName): VipSegment[] {
  if (tier === 'FREE') return [];
  return VIP_SEGMENTS.slice(0, VIP_SEGMENTS.indexOf(tier) + 1);
}

export function isVipSegment(value: unknown): value is VipSegment {
  return VIP_SEGMENTS.includes(String(value) as VipSegment);
}

export function defaultSegmentConfig(segment: VipSegment) {
  return {
    segmentTier: segment,
    ...DEFAULT_SEGMENTS[segment],
    isActive: true,
  };
}

function normalizeQuantity(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function isGiftAllowedForSegment(
  segment: VipSegment,
  gift: { minimumTier: PremiumTier; requiresPremium: boolean },
) {
  const requiredTier = normalizeTier(gift.minimumTier || (gift.requiresPremium ? 'BASIC' : 'FREE'));
  return tierIndex(requiredTier) <= tierIndex(segment);
}

export async function getVipGiftPackConfig() {
  const segments = await prisma.vipGiftPackSegment.findMany({
    where: { segmentTier: { in: VIP_SEGMENTS } },
    include: {
      items: {
        include: { gift: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { segmentTier: 'asc' }],
  });

  const byTier = new Map(segments.map((segment) => [segment.segmentTier as VipSegment, segment]));
  return VIP_SEGMENTS.map((segment) => {
    const existing = byTier.get(segment);
    return existing ?? {
      id: null,
      ...defaultSegmentConfig(segment),
      description: DEFAULT_SEGMENTS[segment].description,
      sortOrder: DEFAULT_SEGMENTS[segment].sortOrder,
      createdAt: null,
      updatedAt: null,
      items: [],
    };
  });
}

export async function updateVipGiftPackConfig(input: { segments: VipPackSegmentInput[] }) {
  const segments = input.segments || [];
  const seenSegments = new Set<string>();

  for (const segment of segments) {
    if (!isVipSegment(segment.segmentTier)) {
      throw new AppError('Invalid VIP segment', 400, 'INVALID_VIP_SEGMENT');
    }
    if (seenSegments.has(segment.segmentTier)) {
      throw new AppError(`Duplicate VIP segment: ${segment.segmentTier}`, 400, 'DUPLICATE_VIP_SEGMENT');
    }
    seenSegments.add(segment.segmentTier);
  }

  return prisma.$transaction(async (tx) => {
    for (const segment of segments) {
      const defaults = DEFAULT_SEGMENTS[segment.segmentTier];
      const items = segment.items || [];
      const giftIds = items.map((item) => String(item.giftId || '').trim()).filter(Boolean);
      const uniqueGiftIds = Array.from(new Set(giftIds));

      const gifts = uniqueGiftIds.length
        ? await tx.gift.findMany({ where: { id: { in: uniqueGiftIds } } })
        : [];
      const giftsById = new Map(gifts.map((gift) => [gift.id, gift]));

      for (const item of items) {
        if (!item.giftId) throw new AppError('Gift is required for VIP pack item', 400, 'VIP_PACK_GIFT_REQUIRED');
        const gift = giftsById.get(item.giftId);
        if (!gift || !gift.isActive) {
          throw new AppError('VIP pack gift must be active', 400, 'VIP_PACK_GIFT_INACTIVE');
        }
        if (!isGiftAllowedForSegment(segment.segmentTier, gift)) {
          throw new AppError(`Gift ${gift.name} requires a higher tier than ${segment.segmentTier}`, 400, 'VIP_PACK_GIFT_TIER_INVALID');
        }
      }

      const saved = await tx.vipGiftPackSegment.upsert({
        where: { segmentTier: segment.segmentTier },
        update: {
          displayName: segment.displayName?.trim() || defaults.displayName,
          description: segment.description?.trim() || defaults.description,
          isActive: segment.isActive !== false,
          sortOrder: Number.isFinite(Number(segment.sortOrder)) ? Number(segment.sortOrder) : defaults.sortOrder,
        },
        create: {
          segmentTier: segment.segmentTier,
          displayName: segment.displayName?.trim() || defaults.displayName,
          description: segment.description?.trim() || defaults.description,
          isActive: segment.isActive !== false,
          sortOrder: Number.isFinite(Number(segment.sortOrder)) ? Number(segment.sortOrder) : defaults.sortOrder,
        },
      });

      await tx.vipGiftPackItem.deleteMany({ where: { segmentId: saved.id } });
      for (const [index, item] of items.entries()) {
        await tx.vipGiftPackItem.create({
          data: {
            segmentId: saved.id,
            giftId: item.giftId,
            quantity: normalizeQuantity(item.quantity),
            isActive: item.isActive !== false,
            sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
          },
        });
      }
    }
  }).then(() => getVipGiftPackConfig());
}

export async function getVipPackSegments(tier: PremiumTierName, claimMonth: string) {
  const previewTier = tier === 'FREE' ? 'BASIC' : tier;
  const segments = segmentsForTier(previewTier);
  const configs = await prisma.vipGiftPackSegment.findMany({
    where: { segmentTier: { in: segments } },
    include: {
      items: {
        where: { isActive: true },
        include: { gift: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  const byTier = new Map(configs.map((config) => [config.segmentTier as VipSegment, config]));

  return segments.map((segment) => {
    const config = byTier.get(segment);
    const warnings: Array<{ segment: VipSegment; code: string; message: string }> = [];
    if (!config) {
      warnings.push({ segment, code: 'SEGMENT_NOT_CONFIGURED', message: `${segment} gift pack is not configured` });
    } else if (!config.isActive) {
      warnings.push({ segment, code: 'SEGMENT_INACTIVE', message: `${segment} gift pack is inactive` });
    }

    const items = config?.isActive
      ? config.items
          .filter((item) => item.gift.isActive && isGiftAllowedForSegment(segment, item.gift))
          .map((item) => ({ quantity: item.quantity, gift: item.gift }))
      : [];

    if (config?.isActive && items.length === 0) {
      warnings.push({ segment, code: 'SEGMENT_HAS_NO_GIFTS', message: `${segment} gift pack has no active gifts` });
    }

    return {
      segment,
      claimMonth,
      config: config ? {
        id: config.id,
        displayName: config.displayName,
        description: config.description,
        isActive: config.isActive,
        sortOrder: config.sortOrder,
      } : null,
      items,
      warnings,
    };
  });
}
