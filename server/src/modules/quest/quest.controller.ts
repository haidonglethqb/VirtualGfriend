import { Request, Response, NextFunction } from 'express';
import { questService } from './quest.service';

export const questController = {
  async getQuests(req: Request, res: Response, next: NextFunction) {
    try {
      const quests = await questService.getAllQuests();
      res.json({ success: true, data: quests });
    } catch (error) {
      next(error);
    }
  },

  async getAllQuestsWithProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const quests = await questService.getAllQuestsWithProgress(req.user!.id);
      res.json({ success: true, data: quests });
    } catch (error) {
      next(error);
    }
  },

  async getMyQuests(req: Request, res: Response, next: NextFunction) {
    try {
      const quests = await questService.getUserQuests(req.user!.id);
      res.json({ success: true, data: quests });
    } catch (error) {
      next(error);
    }
  },

  async getDailyQuests(req: Request, res: Response, next: NextFunction) {
    try {
      const quests = await questService.getDailyQuests(req.user!.id);
      res.json({ success: true, data: quests });
    } catch (error) {
      next(error);
    }
  },

  async startQuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { questId } = req.params;
      const quest = await questService.startQuest(req.user!.id, questId);
      res.json({ success: true, data: quest });
    } catch (error) {
      next(error);
    }
  },

  async completeQuest(req: Request, res: Response, next: NextFunction) {
    try {
      const { questId } = req.params;
      const quest = await questService.completeQuest(req.user!.id, questId);
      res.json({ success: true, data: quest });
    } catch (error) {
      next(error);
    }
  },

  async claimReward(req: Request, res: Response, next: NextFunction) {
    try {
      const { questId } = req.params;
      const result = await questService.claimReward(req.user!.id, questId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
