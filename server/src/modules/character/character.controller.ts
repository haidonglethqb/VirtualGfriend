import { Request, Response, NextFunction } from 'express';
import { characterService } from './character.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';
import { createModuleLogger } from '../../lib/logger';
import { PREMIUM_FEATURES } from '../../lib/constants';
import { prisma } from '../../lib/prisma';

const log = createModuleLogger('CharacterController');

const createCharacterSchema = z.object({
  name: z.string().min(1).max(50),
  nickname: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']).optional(),
  personality: z.enum(['caring', 'playful', 'shy', 'passionate', 'intellectual']).optional(),
  birthday: z.string().optional(),
  bio: z.string().max(500).optional(),
  age: z.number().min(18).max(30).optional(),
  occupation: z.enum(['student', 'office_worker', 'teacher', 'nurse', 'artist', 'developer', 'sales', 'freelancer']).optional(),
  templateId: z.string().uuid().optional(),
  avatarUrl: z.string().max(500).optional(),
});

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  nickname: z.string().optional(),
  personality: z.enum(['caring', 'playful', 'shy', 'passionate', 'intellectual']).optional(),
  bio: z.string().max(500).optional(),
  responseStyle: z.string().optional(),
  creativityLevel: z.number().min(0).max(1).optional(),
  avatarUrl: z.string().max(500).optional(),
  templateId: z.string().uuid().optional(),
});

const customizeCharacterSchema = z.object({
  avatarStyle: z.string().optional(),
  hairStyle: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  skinTone: z.string().optional(),
  outfit: z.string().optional(),
  accessories: z.array(z.string()).optional(),
});

const addFactSchema = z.object({
  category: z.enum(['preference', 'memory', 'trait', 'event']),
  key: z.string().min(1),
  value: z.string().min(1),
  importance: z.number().min(1).max(10).optional(),
});

export const characterController = {
  async getMyCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await characterService.getActiveCharacter(req.user!.id);
      res.json({ success: true, data: character });
    } catch (error) {
      next(error);
    }
  },

  async createCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      log.debug('Received request body:', req.body);
      const data = createCharacterSchema.parse(req.body);
      log.debug('Validated data:', data);

      // Check character limit based on premium tier
      const tier = req.premiumInfo?.tier || 'FREE';
      const maxCharacters = PREMIUM_FEATURES[tier].maxCharacters;

      // Count existing characters (including inactive ones)
      const existingCount = await prisma.character.count({
        where: { userId: req.user!.id },
      });

      if (maxCharacters !== -1 && existingCount >= maxCharacters) {
        log.warn(`User ${req.user!.id} exceeded character limit: ${existingCount}/${maxCharacters}`);
        return next(
          new AppError(
            `Bạn đã đạt giới hạn số nhân vật (${maxCharacters}). Nâng cấp VIP để tạo thêm!`,
            403,
            'CHARACTER_LIMIT_REACHED'
          )
        );
      }

      const character = await characterService.createCharacter(req.user!.id, data);
      log.debug('Character created:', character.id);
      res.status(201).json({ success: true, data: character });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async updateCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateCharacterSchema.parse(req.body);
      const character = await characterService.updateCharacter(req.user!.id, data);
      res.json({ success: true, data: character });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async customizeCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      const data = customizeCharacterSchema.parse(req.body);
      const character = await characterService.customizeCharacter(req.user!.id, data);
      res.json({ success: true, data: character });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async getFacts(req: Request, res: Response, next: NextFunction) {
    try {
      const facts = await characterService.getFacts(req.user!.id);
      res.json({ success: true, data: facts });
    } catch (error) {
      next(error);
    }
  },

  async addFact(req: Request, res: Response, next: NextFunction) {
    try {
      const data = addFactSchema.parse(req.body);
      const fact = await characterService.addFact(req.user!.id, data);
      res.status(201).json({ success: true, data: fact });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async getRelationshipStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await characterService.getRelationshipStatus(req.user!.id);
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  },
};
