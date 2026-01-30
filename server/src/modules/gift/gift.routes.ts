import { Router } from 'express';
import { giftController } from './gift.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const giftRouter = Router();

giftRouter.use(authenticate);

giftRouter.get('/', giftController.getGifts);
giftRouter.get('/inventory', giftController.getInventory);
giftRouter.post('/buy', giftController.buyGift);
giftRouter.post('/send', giftController.sendGift);
giftRouter.get('/history', giftController.getGiftHistory);
