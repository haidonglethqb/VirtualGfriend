import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';

export const analyticsController = {
  async getCharacterAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getCharacterAnalytics(req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboardStats(req.user!.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default analyticsController;
