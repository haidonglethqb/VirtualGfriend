import { Request, Response, NextFunction } from 'express';
import { memoryService } from './memory.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';

const createMemorySchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  type: z.enum(['MILESTONE', 'PHOTO', 'CONVERSATION', 'GIFT', 'EVENT']),
  milestone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const memoryController = {
  async getMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string;
      
      const memories = await memoryService.getMemories(req.user!.id, page, limit, type);
      res.json({ success: true, data: memories });
    } catch (error) {
      next(error);
    }
  },

  async getMilestones(req: Request, res: Response, next: NextFunction) {
    try {
      const milestones = await memoryService.getMilestones(req.user!.id);
      res.json({ success: true, data: milestones });
    } catch (error) {
      next(error);
    }
  },

  async createMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createMemorySchema.parse(req.body);
      const memory = await memoryService.createMemory(req.user!.id, data);
      res.status(201).json({ success: true, data: memory });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const { memoryId } = req.params;
      const memory = await memoryService.toggleFavorite(req.user!.id, memoryId);
      res.json({ success: true, data: memory });
    } catch (error) {
      next(error);
    }
  },

  async deleteMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const { memoryId } = req.params;
      await memoryService.deleteMemory(req.user!.id, memoryId);
      res.json({ success: true, message: 'Memory deleted' });
    } catch (error) {
      next(error);
    }
  },
};
