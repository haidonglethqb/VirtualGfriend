import { Request, Response, NextFunction } from 'express';
import { userService } from './users.service';
import { z } from 'zod';
import { AppError } from '../../middlewares/error.middleware';

const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  displayName: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

const updateSettingsSchema = z.object({
  language: z.string().optional(),
  theme: z.enum(['dark', 'light', 'auto']).optional(),
  notificationsEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  musicEnabled: z.boolean().optional(),
  autoPlayVoice: z.boolean().optional(),
  chatBubbleStyle: z.string().optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
});

const updatePrivacySchema = z.object({
  profilePublic: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
});

export const userController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.user!.id);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateProfileSchema.parse(req.body);
      const profile = await userService.updateProfile(req.user!.id, data);
      res.json({ success: true, data: profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await userService.getSettings(req.user!.id);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSettingsSchema.parse(req.body);
      const settings = await userService.updateSettings(req.user!.id, data);
      res.json({ success: true, data: settings });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async getPrivacySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const privacy = await userService.getPrivacySettings(req.user!.id);
      res.json({ success: true, data: privacy });
    } catch (error) {
      next(error);
    }
  },

  async updatePrivacySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updatePrivacySchema.parse(req.body);
      const privacy = await userService.updatePrivacySettings(req.user!.id, data);
      res.json({ success: true, data: privacy });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }
      next(error);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await userService.getStats(req.user!.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const notifications = await userService.getNotifications(req.user!.id, page, limit);
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  },

  async markNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      await userService.markNotificationsRead(req.user!.id, ids);
      res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },
};
