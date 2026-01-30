import { Request, Response, NextFunction } from 'express';
import { characterService } from './character.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';

const createCharacterSchema = z.object({
  name: z.string().min(1).max(50),
  nickname: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  personality: z.enum(['caring', 'playful', 'shy', 'passionate', 'intellectual']).optional(),
  birthday: z.string().optional(),
  bio: z.string().max(500).optional(),
});

const updateCharacterSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  nickname: z.string().optional(),
  personality: z.enum(['caring', 'playful', 'shy', 'passionate', 'intellectual']).optional(),
  bio: z.string().max(500).optional(),
  responseStyle: z.string().optional(),
  creativityLevel: z.number().min(0).max(1).optional(),
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
      const data = createCharacterSchema.parse(req.body);
      const character = await characterService.createCharacter(req.user!.id, data);
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
