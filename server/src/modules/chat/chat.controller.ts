import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../lib/prisma';
import { createModuleLogger } from '../../lib/logger';
import { getTierConfig } from '../admin/tier-config.service';
import type { TierConfig } from '../admin/tier-config.service';

const log = createModuleLogger('ChatController');

const sendMessageSchema = z.object({
  characterId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  messageType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'GIFT', 'STICKER', 'EVENT']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const chatController = {
  /**
   * Get daily message usage for current user
   */
  async getDailyUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const tier = req.premiumInfo?.tier || 'FREE';
      const usage = await chatService.checkDailyLimit(req.user!.id, tier);

      res.json({
        success: true,
        data: {
          tier,
          isVip: req.premiumInfo?.isVip || false,
          messagesUsed: usage.used,
          messagesLimit: usage.limit,
          messagesRemaining: usage.remaining,
          isUnlimited: usage.limit === -1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get active character for this user to filter messages
      const character = await prisma.character.findFirst({
        where: { userId: req.user!.id, isActive: true },
      });
      if (!character) {
        return res.json({ success: true, data: { messages: [], total: 0, page: 1, pageSize: limit, hasMore: false } });
      }
      
      const history = await chatService.getHistory(req.user!.id, character.id, page, limit);
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
      log.debug('=== SEND MESSAGE REQUEST ===');
      log.debug('User ID:', req.user!.id);
      log.debug('Request body:', req.body);

      const data = sendMessageSchema.parse(req.body);
      log.debug('Validated data:', data);

      // Check message type restrictions based on tier
      const messageType = data.messageType || 'TEXT';
      if (messageType !== 'TEXT' && messageType !== 'GIFT' && messageType !== 'EVENT') {
        const tier = req.premiumInfo?.tier || 'FREE';
        const tierConfig = await getTierConfig(tier);

        const featureMap: Record<string, keyof TierConfig> = {
          'IMAGE': 'sendImages',
          'VOICE': 'voiceMessages',
          'VIDEO': 'sendVideos',
          'STICKER': 'sendStickers',
        };

        const feature = featureMap[messageType];
        if (feature && !tierConfig[feature]) {
          return next(
            new AppError(
              `Tin nhắn ${messageType.toLowerCase()} cần nâng cấp VIP`,
              403,
              'MESSAGE_TYPE_LOCKED'
            )
          );
        }
      }

      // Check daily message limit based on premium tier
      const tier = req.premiumInfo?.tier || 'FREE';
      const limitCheck = await chatService.checkDailyLimit(req.user!.id, tier);

      if (!limitCheck.canSend) {
        log.warn(`User ${req.user!.id} exceeded daily limit: ${limitCheck.used}/${limitCheck.limit}`);
        return next(
          new AppError(
            `Bạn đã hết lượt tin nhắn hôm nay (${limitCheck.limit} tin). Nâng cấp VIP để nhắn không giới hạn!`,
            403,
            'DAILY_LIMIT_REACHED'
          )
        );
      }

      // If no characterId provided, get user's active character
      let characterId = data.characterId;
      if (!characterId) {
        const character = await prisma.character.findFirst({
          where: { userId: req.user!.id, isActive: true },
        });
        if (!character) {
          log.error('No active character found for user:', req.user!.id);
          return next(new AppError('No active character found', 400, 'NO_CHARACTER'));
        }
        characterId = character.id;
        log.debug('Using active character:', characterId);
      }

      log.debug('Calling chatService.sendMessage...');
      const result = await chatService.sendMessage(req.user!.id, {
        ...data,
        characterId,
      });

      // Increment daily count in cache after successful send
      await chatService.incrementDailyCount(req.user!.id);

      // Include remaining messages in response for frontend
      const newUsage = await chatService.checkDailyLimit(req.user!.id, tier);

      log.debug('=== SEND MESSAGE SUCCESS ===');
      log.debug('AI Response:', result.aiMessage?.content?.substring(0, 100));
      res.json({
        success: true,
        data: {
          ...result,
          dailyUsage: {
            used: newUsage.used,
            limit: newUsage.limit,
            remaining: newUsage.remaining,
            isUnlimited: newUsage.limit === -1,
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
