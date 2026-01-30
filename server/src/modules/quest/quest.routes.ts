import { Router } from 'express';
import { questController } from './quest.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const questRouter = Router();

questRouter.use(authenticate);

questRouter.get('/', questController.getQuests);
questRouter.get('/all', questController.getAllQuestsWithProgress);
questRouter.get('/me', questController.getMyQuests);
questRouter.get('/my', questController.getMyQuests);
questRouter.get('/daily', questController.getDailyQuests);
questRouter.post('/start/:questId', questController.startQuest);
questRouter.post('/complete/:questId', questController.completeQuest);
questRouter.post('/claim/:questId', questController.claimReward);
