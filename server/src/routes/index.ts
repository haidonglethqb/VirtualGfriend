import { Router, Request, Response } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { userRouter } from '../modules/users/users.routes';
import { characterRouter } from '../modules/character/character.routes';
import { chatRouter } from '../modules/chat/chat.routes';
import { questRouter } from '../modules/quest/quest.routes';
import { giftRouter } from '../modules/gift/gift.routes';
import { sceneRouter } from '../modules/scene/scene.routes';
import { memoryRouter } from '../modules/memory/memory.routes';
import { gameRouter } from '../modules/game/game.routes';

export const router = Router();

// Mount routes
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/character', characterRouter);
router.use('/chat', chatRouter);
router.use('/quests', questRouter);
router.use('/gifts', giftRouter);
router.use('/shop', giftRouter); // Alias for gift shop
router.use('/scenes', sceneRouter);
router.use('/memories', memoryRouter);
router.use('/game', gameRouter);

// API info
router.get('/', (_: Request, res: Response) => {
  res.json({
    name: 'VGfriend API',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/character',
      '/api/chat',
      '/api/quests',
      '/api/gifts',
      '/api/shop',
      '/api/scenes',
      '/api/memories',
      '/api/game',
    ],
  });
});
