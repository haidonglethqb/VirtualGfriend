import { Request, Response, NextFunction } from 'express';
import { sceneService } from './scene.service';

export const sceneController = {
  async getScenes(req: Request, res: Response, next: NextFunction) {
    try {
      const scenes = await sceneService.getAllScenes(req.user!.id);
      res.json({ success: true, data: scenes });
    } catch (error) {
      next(error);
    }
  },

  async getUnlockedScenes(req: Request, res: Response, next: NextFunction) {
    try {
      const scenes = await sceneService.getUnlockedScenes(req.user!.id);
      res.json({ success: true, data: scenes });
    } catch (error) {
      next(error);
    }
  },

  async unlockScene(req: Request, res: Response, next: NextFunction) {
    try {
      const { sceneId } = req.params;
      const result = await sceneService.unlockScene(req.user!.id, sceneId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async setActiveScene(req: Request, res: Response, next: NextFunction) {
    try {
      const { sceneId } = req.params;
      await sceneService.setActiveScene(req.user!.id, sceneId);
      res.json({ success: true, message: 'Scene activated' });
    } catch (error) {
      next(error);
    }
  },
};
