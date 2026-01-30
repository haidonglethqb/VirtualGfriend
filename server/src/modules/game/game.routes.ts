import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { gameEventService } from './game-event.service';

export const gameRouter = Router();

gameRouter.use(authenticate);

// Get daily progress summary
gameRouter.get('/daily-progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await gameEventService.getDailyProgress(req.user!.id);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
});

// Trigger daily login (called when user opens app)
gameRouter.post('/daily-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await gameEventService.processAction({
      userId: req.user!.id,
      action: 'DAILY_LOGIN',
    });
    res.json({ 
      success: true, 
      data: {
        questsCompleted: result.questsCompleted,
        milestonesUnlocked: result.milestonesUnlocked,
      }
    });
  } catch (error) {
    next(error);
  }
});
