import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { cache, CacheKeys } from '../../lib/redis';
import { getTierConfig, type PremiumTier } from '../admin/tier-config.service';

const VALID_CATEGORIES = new Set([
  'personal',
  'preference',
  'relationship',
  'work',
  'life',
  'memory',
  'event',
  'other',
]);

const KEY_ALIASES: Record<string, string> = {
  ten: 'ten_that',
  ten_that: 'ten_that',
  ten_thật: 'ten_that',
  tên_thật: 'ten_that',
  ho_ten: 'ten_that',
  họ_tên: 'ten_that',
  nghe_nghiep: 'nghe_nghiep',
  nghề_nghiệp: 'nghe_nghiep',
  cong_viec: 'nghe_nghiep',
  công_việc: 'nghe_nghiep',
  que_quan: 'que_quan',
  quê_quán: 'que_quan',
  tuoi: 'tuoi',
  tuổi: 'tuoi',
  cach_xung_ho: 'cach_xung_ho',
  cách_xưng_hô: 'cach_xung_ho',
};

export interface FactQuota {
  tier: PremiumTier;
  limit: number;
  used: number;
  remaining: number;
  isFull: boolean;
}

export interface IncomingFact {
  key: string;
  value: string;
  category?: string;
  importance?: number;
}

export interface FactSaveResult {
  characterId: string;
  added: number;
  updated: number;
  skipped: number;
  total: number;
  quota: FactQuota;
}

function resolveTier(tier?: string | null): PremiumTier {
  return tier === 'BASIC' || tier === 'PRO' || tier === 'ULTIMATE' ? tier : 'FREE';
}

function stripVietnamese(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeFactKey(key: string): string {
  const trimmed = key.trim().toLowerCase().replace(/\s+/g, '_');
  const ascii = stripVietnamese(trimmed)
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return KEY_ALIASES[trimmed] || KEY_ALIASES[ascii] || ascii || 'thong_tin';
}

export function normalizeFactCategory(category?: string | null): string {
  if (!category) return 'other';
  if (category === 'trait') return 'personal';
  if (VALID_CATEGORIES.has(category)) return category;
  return 'other';
}

export const factQuotaService = {
  async getQuotaForCharacter(characterId: string): Promise<FactQuota> {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        user: {
          select: {
            premiumTier: true,
          },
        },
      },
    });

    const tier = resolveTier(character?.user?.premiumTier);
    const [config, used] = await Promise.all([
      getTierConfig(tier),
      prisma.characterFact.count({ where: { characterId } }),
    ]);

    const limit = config.maxFacts ?? 20;
    const remaining = limit < 0 ? -1 : Math.max(0, limit - used);

    return {
      tier,
      limit,
      used,
      remaining,
      isFull: limit >= 0 && used >= limit,
    };
  },

  async invalidate(characterId: string) {
    await cache.del(CacheKeys.characterWithFacts(characterId));
  },

  async saveFactsQuotaAware(
    characterId: string,
    facts: IncomingFact[],
    sourceType: 'ai_inline' | 'ai_batch',
    calculateImportance: (category: string, value: string) => number,
  ): Promise<FactSaveResult> {
    const normalizedFacts = facts
      .filter((fact) => fact.key?.trim() && fact.value?.trim())
      .map((fact) => ({
        ...fact,
        key: normalizeFactKey(fact.key),
        value: fact.value.trim(),
        category: normalizeFactCategory(fact.category),
      }));

    if (normalizedFacts.length === 0) {
      const quota = await this.getQuotaForCharacter(characterId);
      return { characterId, added: 0, updated: 0, skipped: 0, total: quota.used, quota };
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { user: { select: { premiumTier: true } } },
    });
    const tier = resolveTier(character?.user?.premiumTier);
    const config = await getTierConfig(tier);
    const limit = config.maxFacts ?? 20;
    const keys = [...new Set(normalizedFacts.map((fact) => fact.key))];

    const seenKeys = new Set<string>();

    let added = 0;
    let updated = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      const [used, existingFacts] = await Promise.all([
        tx.characterFact.count({ where: { characterId } }),
        tx.characterFact.findMany({ where: { characterId, key: { in: keys } } }),
      ]);
      const existingByKey = new Map(existingFacts.map((fact) => [fact.key, fact]));
      let remainingSlots = limit < 0 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

      for (const fact of normalizedFacts) {
        if (seenKeys.has(fact.key)) {
          skipped++;
          continue;
        }
        seenKeys.add(fact.key);

        const existing = existingByKey.get(fact.key);
        const importance = fact.importance ?? calculateImportance(fact.category, fact.value);

        if (existing) {
          const existingIsManual = existing.sourceType === 'manual' || existing.importance >= 8;
          const shouldUpdateManual = !existingIsManual || fact.value.length > existing.value.length + 10;
          if (!shouldUpdateManual) {
            skipped++;
            continue;
          }

          await tx.characterFact.update({
            where: { id: existing.id },
            data: {
              value: fact.value,
              category: fact.category,
              importance: existingIsManual ? Math.max(existing.importance, importance, 8) : importance,
              sourceType: existingIsManual ? existing.sourceType : sourceType,
              updatedAt: new Date(),
            },
          });
          updated++;
          continue;
        }

        if (remainingSlots <= 0) {
          skipped++;
          continue;
        }

        try {
          await tx.characterFact.create({
            data: {
              characterId,
              key: fact.key,
              value: fact.value,
              category: fact.category,
              importance,
              sourceType,
              learnedAt: new Date(),
            },
          });
          added++;
          remainingSlots--;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            skipped++;
            continue;
          }
          throw error;
        }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (added > 0 || updated > 0) {
      await this.invalidate(characterId);
    }

    const quota = await this.getQuotaForCharacter(characterId);
    return {
      characterId,
      added,
      updated,
      skipped,
      total: quota.used,
      quota,
    };
  },
};
