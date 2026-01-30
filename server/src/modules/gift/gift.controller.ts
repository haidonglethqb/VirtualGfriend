import { Request, Response, NextFunction } from 'express';
import { giftService } from './gift.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../lib/prisma';

const buyGiftSchema = z.object({
  giftId: z.string().uuid(),
  quantity: z.number().int().positive().optional().default(1),
  paymentMethod: z.enum(['coins', 'gems']).optional().default('coins'),
});

const sendGiftSchema = z.object({
  characterId: z.string().uuid().optional(),
  giftId: z.string().uuid(),
  message: z.string().max(200).optional(),
});

export const giftController = {
  async getGifts(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string;
      const gifts = await giftService.getGifts(category);
      res.json({ success: true, data: gifts });
    } catch (error) {
      next(error);
    }
  },

  async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const inventory = await giftService.getInventory(req.user!.id);
      res.json({ success: true, data: inventory });
    } catch (error) {
      next(error);
    }
  },

  async buyGift(req: Request, res: Response, next: NextFunction) {
    try {
      const data = buyGiftSchema.parse(req.body);
      const result = await giftService.buyGift(req.user!.id, data);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async sendGift(req: Request, res: Response, next: NextFunction) {
    try {
      const data = sendGiftSchema.parse(req.body);
      
      // If no characterId provided, get user's active character
      let characterId = data.characterId;
      if (!characterId) {
        const character = await prisma.character.findFirst({
          where: { userId: req.user!.id, isActive: true },
        });
        if (!character) {
          return next(new AppError('No active character found', 400, 'NO_CHARACTER'));
        }
        characterId = character.id;
      }
      
      const result = await giftService.sendGift(req.user!.id, {
        ...data,
        characterId,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async getGiftHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await giftService.getGiftHistory(req.user!.id, page, limit);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  },
};
