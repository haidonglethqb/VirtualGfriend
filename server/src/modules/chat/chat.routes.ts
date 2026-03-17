import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { attachPremiumInfo } from '../../middlewares/premium.middleware';

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.use(attachPremiumInfo);

chatRouter.get('/history', chatController.getHistory);
chatRouter.get('/history/:characterId', chatController.getCharacterHistory);
chatRouter.get('/daily-usage', chatController.getDailyUsage);
chatRouter.post('/send', chatController.sendMessage);
chatRouter.delete('/message/:messageId', chatController.deleteMessage);
chatRouter.get('/search', chatController.searchMessages);
