import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get('/history', chatController.getHistory);
chatRouter.get('/history/:characterId', chatController.getCharacterHistory);
chatRouter.post('/send', chatController.sendMessage);
chatRouter.delete('/message/:messageId', chatController.deleteMessage);
chatRouter.get('/search', chatController.searchMessages);
