import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { gameEventService } from './game-event.service';
import type { GameAction } from './game-event.service';

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

const GAME_ACTIONS: GameAction[] = [
  'SEND_MESSAGE',
  'RECEIVE_MESSAGE',
  'SEND_GIFT',
  'DAILY_LOGIN',
  'FIRST_MESSAGE_TODAY',
  'REACH_AFFECTION_LEVEL',
  'REACH_LEVEL',
  'COMPLETE_QUEST',
  'UNLOCK_SCENE',
  'RELATIONSHIP_UPGRADE',
];

const ACTION_ALIASES: Record<string, GameAction> = {
  send_message: 'SEND_MESSAGE',
  chat: 'SEND_MESSAGE',
  romantic_message: 'SEND_MESSAGE',
  morning_greeting: 'FIRST_MESSAGE_TODAY',
  goodnight_message: 'FIRST_MESSAGE_TODAY',
  receive_message: 'RECEIVE_MESSAGE',
  send_gift: 'SEND_GIFT',
  gift: 'SEND_GIFT',
  first_gift: 'SEND_GIFT',
  daily_login: 'DAILY_LOGIN',
  login: 'DAILY_LOGIN',
  first_message: 'FIRST_MESSAGE_TODAY',
  first_message_today: 'FIRST_MESSAGE_TODAY',
  reach_affection: 'REACH_AFFECTION_LEVEL',
  reach_level: 'REACH_LEVEL',
  complete_quest: 'COMPLETE_QUEST',
  unlock_scene: 'UNLOCK_SCENE',
  relationship_upgrade: 'RELATIONSHIP_UPGRADE',
};

function normalizeGameAction(rawAction: unknown): GameAction | null {
  if (typeof rawAction !== 'string') return null;

  const directAction = rawAction.toUpperCase() as GameAction;
  if (GAME_ACTIONS.includes(directAction)) return directAction;

  return ACTION_ALIASES[rawAction.toLowerCase()] ?? null;
}

gameRouter.post('/action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawAction = req.body?.action;
    const action = normalizeGameAction(rawAction);
    if (!action) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_GAME_ACTION', message: 'Invalid game action' },
      });
    }

    const result = await gameEventService.processAction({
      userId: req.user!.id,
      action,
      metadata: {
        ...req.body?.metadata,
        ...(typeof rawAction === 'string' ? { sourceAction: rawAction.toLowerCase() } : {}),
      },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
