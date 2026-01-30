import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../lib/prisma';

const sendMessageSchema = z.object({
  characterId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'GIFT', 'STICKER', 'EVENT']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const chatController = {
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await chatService.getHistory(req.user!.id, page, limit);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  },

  async getCharacterHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { characterId } = req.params;
      const cursor = req.query.cursor as string;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = await chatService.getCharacterHistory(
        req.user!.id,
        characterId,
        limit,
        cursor
      );
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = sendMessageSchema.parse(req.body);
      
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
      
      const result = await chatService.sendMessage(req.user!.id, {
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

  async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      await chatService.deleteMessage(req.user!.id, messageId);
      res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
      next(error);
    }
  },

  async searchMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!query) {
        throw new AppError('Search query is required', 400, 'MISSING_QUERY');
      }
      
      const results = await chatService.searchMessages(req.user!.id, query, limit);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },
};
