import { Request, Response, NextFunction } from 'express';
import { templateService } from './template.service';

export const templateController = {
  async getTemplates(_req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await templateService.getAll();
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  },
};
