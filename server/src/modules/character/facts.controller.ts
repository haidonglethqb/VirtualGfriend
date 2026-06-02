import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { factQuotaService, normalizeFactCategory, normalizeFactKey } from './fact-quota.service';
import { realtimeEvents } from '../../lib/realtime-events';
import { cleanupLowQualityAiFacts } from '../ai/memory-policy.service';
import { getExAccess } from './ex-access.service';

const querySchema = z.object({
  characterId: z.string().uuid().optional(),
});

const updateFactSchema = z.object({
  value: z.string().min(1).max(500),
});

function inferFactSource(fact: { importance: number; sourceType?: string | null }) {
  if (fact.sourceType === 'ai_inline') return 'ai_inline';
  if (fact.sourceType === 'manual') return 'user_added';
  return fact.importance >= 8 ? 'user_added' : 'ai_learned';
}

function emitManualFactUpdate(
  userId: string,
  characterId: string,
  quota: Awaited<ReturnType<typeof factQuotaService.getQuotaForCharacter>>,
  counts: { added?: number; updated?: number; skipped?: number },
) {
  realtimeEvents.emit('character:facts_update', {
    userId,
    characterId,
    added: counts.added || 0,
    updated: counts.updated || 0,
    skipped: counts.skipped || 0,
    total: quota.used,
    quota,
    source: 'manual',
  });
}

export const factsController = {
  async resolveCharacter(req: Request) {
    const query = querySchema.parse(req.query ?? {});
    const character = await prisma.character.findFirst({
      where: query.characterId
        ? {
          id: query.characterId,
          userId: req.user!.id,
          isExPersona: false,
          OR: [
            { isActive: true, isEnded: false },
            { isActive: false, isEnded: true },
          ],
        }
        : { userId: req.user!.id, isActive: true, isEnded: false, isExPersona: false },
      ...(query.characterId ? {} : { orderBy: { createdAt: 'desc' as const } }),
      include: {
        template: {
          select: { avatarUrl: true },
        },
      },
    });

    if (!character) {
      throw new AppError('No active character', 404, 'NO_CHARACTER');
    }

    if (query.characterId && character.isEnded) {
      const access = await getExAccess(req.user!.id);
      if (!access.isVip) {
        throw new AppError('VIP required to view ex relationship facts', 403, 'EX_FACTS_PREMIUM_REQUIRED');
      }
    }

    return character;
  },

  /**
   * Get all facts for user's character
   */
  async getFacts(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await factsController.resolveCharacter(req);
      await cleanupLowQualityAiFacts(character.id);

      const facts = await prisma.characterFact.findMany({
        where: { characterId: character.id },
        orderBy: [
          { importance: 'desc' },
          { updatedAt: 'desc' },
        ],
      });
      const quota = await factQuotaService.getQuotaForCharacter(character.id);

      // Group by category
      type FactType = typeof facts[number];
      const groupedFacts = facts.reduce<Record<string, FactType[]>>((acc, fact) => {
        const category = fact.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(fact);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          facts: facts.map(f => ({
            ...f,
            source: inferFactSource(f),
          })),
          grouped: Object.fromEntries(
            Object.entries(groupedFacts).map(([cat, items]) => [
              cat, 
              items.map(f => ({
                ...f,
                source: inferFactSource(f),
              }))
            ])
          ),
          total: facts.length,
          quota,
          character: {
            id: character.id,
            name: character.name,
            avatarUrl: character.avatarUrl || character.template?.avatarUrl || null,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  /**
   * Update a fact's value
   */
  async updateFact(req: Request, res: Response, next: NextFunction) {
    try {
      const { factId } = req.params;
      const data = updateFactSchema.parse(req.body);
      const character = await factsController.resolveCharacter(req);

      const fact = await prisma.characterFact.findFirst({
        where: { id: factId, characterId: character.id },
      });

      if (!fact) {
        throw new AppError('Fact not found', 404, 'FACT_NOT_FOUND');
      }

      const updated = await prisma.characterFact.update({
        where: { id: factId },
        data: {
          value: data.value,
          sourceType: 'manual',
          importance: 8, // Mark as user-edited
          updatedAt: new Date(),
        },
      });
      await factQuotaService.invalidate(character.id);
      const quota = await factQuotaService.getQuotaForCharacter(character.id);
      emitManualFactUpdate(req.user!.id, character.id, quota, { updated: 1 });

      res.json({
        success: true,
        data: {
          ...updated,
          source: 'user_edited',
          quota,
          character: {
            id: character.id,
            name: character.name,
            avatarUrl: character.avatarUrl || character.template?.avatarUrl || null,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  /**
   * Delete a fact
   */
  async deleteFact(req: Request, res: Response, next: NextFunction) {
    try {
      const { factId } = req.params;
      const character = await factsController.resolveCharacter(req);

      const fact = await prisma.characterFact.findFirst({
        where: { id: factId, characterId: character.id },
      });

      if (!fact) {
        throw new AppError('Fact not found', 404, 'FACT_NOT_FOUND');
      }

      await prisma.characterFact.delete({
        where: { id: factId },
      });
      await factQuotaService.invalidate(character.id);
      const quota = await factQuotaService.getQuotaForCharacter(character.id);
      emitManualFactUpdate(req.user!.id, character.id, quota, { updated: 0 });

      res.json({
        success: true,
        message: 'Fact deleted',
        data: {
          quota,
          character: {
            id: character.id,
            name: character.name,
            avatarUrl: character.avatarUrl || character.template?.avatarUrl || null,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  /**
   * Add a new fact manually
   */
  async addFact(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        key: z.string().min(1).max(100),
        value: z.string().min(1).max(500),
        category: z.enum(['personal', 'preference', 'relationship', 'work', 'life', 'memory', 'event', 'other']).optional(),
      });

      const parsed = schema.parse(req.body);
      const data = {
        ...parsed,
        key: normalizeFactKey(parsed.key),
        category: normalizeFactCategory(parsed.category),
      };
      const character = await factsController.resolveCharacter(req);

      // Check for duplicate key
      const existing = await prisma.characterFact.findFirst({
        where: {
          characterId: character.id,
          key: data.key,
        },
      });

      if (existing) {
        // Update instead of create
        const updated = await prisma.characterFact.update({
          where: { id: existing.id },
          data: {
            value: data.value,
            category: data.category || existing.category,
            sourceType: 'manual',
            importance: 8, // User-added facts are important
            updatedAt: new Date(),
          },
        });
        await factQuotaService.invalidate(character.id);
        const quota = await factQuotaService.getQuotaForCharacter(character.id);
        emitManualFactUpdate(req.user!.id, character.id, quota, { updated: 1 });
        return res.json({
          success: true,
          data: {
            ...updated,
            source: 'user_added',
            quota,
            character: {
              id: character.id,
              name: character.name,
              avatarUrl: character.avatarUrl || character.template?.avatarUrl || null,
            },
          },
          updated: true,
        });
      }

      const quota = await factQuotaService.getQuotaForCharacter(character.id);
      if (quota.isFull) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FACT_LIMIT_REACHED',
            message: 'Fact limit reached for this character',
          },
          quota,
        });
      }

      const fact = await prisma.$transaction(async (tx) => {
        const used = await tx.characterFact.count({ where: { characterId: character.id } });
        if (quota.limit >= 0 && used >= quota.limit) {
          return null;
        }

        return tx.characterFact.create({
          data: {
            characterId: character.id,
            key: data.key,
            value: data.value,
            category: data.category || 'other',
            sourceType: 'manual',
            importance: 8, // User-added facts are important
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (!fact) {
        const latestQuota = await factQuotaService.getQuotaForCharacter(character.id);
        return res.status(403).json({
          success: false,
          error: {
            code: 'FACT_LIMIT_REACHED',
            message: 'Fact limit reached for this character',
          },
          quota: latestQuota,
        });
      }
      await factQuotaService.invalidate(character.id);
      const updatedQuota = await factQuotaService.getQuotaForCharacter(character.id);
      emitManualFactUpdate(req.user!.id, character.id, updatedQuota, { added: 1 });

      res.status(201).json({
        success: true,
        data: {
          ...fact,
          source: 'user_added',
          quota: updatedQuota,
          character: {
            id: character.id,
            name: character.name,
            avatarUrl: character.avatarUrl || character.template?.avatarUrl || null,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },
};

export default factsController;
