import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

const updateFactSchema = z.object({
  value: z.string().min(1).max(500),
});

export const factsController = {
  /**
   * Get all facts for user's character
   */
  async getFacts(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await prisma.character.findFirst({
        where: { userId: req.user!.id, isActive: true },
      });

      if (!character) {
        throw new AppError('No active character', 404, 'NO_CHARACTER');
      }

      const facts = await prisma.characterFact.findMany({
        where: { characterId: character.id },
        orderBy: [
          { importance: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

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
            source: f.importance >= 8 ? 'user_added' : 'ai_learned', // Infer source from importance
          })),
          grouped: Object.fromEntries(
            Object.entries(groupedFacts).map(([cat, items]) => [
              cat, 
              items.map(f => ({
                ...f,
                source: f.importance >= 8 ? 'user_added' : 'ai_learned',
              }))
            ])
          ),
          total: facts.length,
        },
      });
    } catch (error) {
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

      const character = await prisma.character.findFirst({
        where: { userId: req.user!.id, isActive: true },
      });

      if (!character) {
        throw new AppError('No active character', 404, 'NO_CHARACTER');
      }

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
          importance: 8, // Mark as user-edited
          updatedAt: new Date(),
        },
      });

      res.json({ success: true, data: { ...updated, source: 'user_edited' } });
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

      const character = await prisma.character.findFirst({
        where: { userId: req.user!.id, isActive: true },
      });

      if (!character) {
        throw new AppError('No active character', 404, 'NO_CHARACTER');
      }

      const fact = await prisma.characterFact.findFirst({
        where: { id: factId, characterId: character.id },
      });

      if (!fact) {
        throw new AppError('Fact not found', 404, 'FACT_NOT_FOUND');
      }

      await prisma.characterFact.delete({
        where: { id: factId },
      });

      res.json({ success: true, message: 'Fact deleted' });
    } catch (error) {
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
        category: z.enum(['personal', 'preference', 'relationship', 'work', 'life', 'other']).optional(),
      });

      const data = schema.parse(req.body);

      const character = await prisma.character.findFirst({
        where: { userId: req.user!.id, isActive: true },
      });

      if (!character) {
        throw new AppError('No active character', 404, 'NO_CHARACTER');
      }

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
            importance: 8, // User-added facts are important
            updatedAt: new Date(),
          },
        });
        return res.json({ success: true, data: { ...updated, source: 'user_added' }, updated: true });
      }

      const fact = await prisma.characterFact.create({
        data: {
          characterId: character.id,
          key: data.key,
          value: data.value,
          category: data.category || 'other',
          importance: 8, // User-added facts are important
        },
      });

      res.status(201).json({ success: true, data: { ...fact, source: 'user_added' } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },
};

export default factsController;
