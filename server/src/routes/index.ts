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
import analyticsRouter from '../modules/analytics/analytics.routes';
import { dmRouter } from '../modules/dm/dm.routes';
import { leaderboardRouter } from '../modules/leaderboard/leaderboard.routes';
import { adminRouter } from '../modules/admin';
import { paymentRouter } from '../modules/payment/payment.routes';
import { dailyRewardRoutes } from '../modules/daily-reward/daily-reward.routes';
import { achievementRoutes } from '../modules/achievement/achievement.routes';
import { arcRoutes } from '../modules/arc/arc.routes';
import { energyRoutes } from '../modules/energy/energy.routes';
import { socialStatsRoutes } from '../modules/social-stats/social-stats.routes';
import { eventRoutes } from '../modules/event/event.routes';
import { getAllTierConfigs } from '../modules/admin/tier-config.service';
import { AppError } from '../middlewares/error.middleware';

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
router.use('/analytics', analyticsRouter);
router.use('/dm', dmRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/admin', adminRouter);
router.use('/payment', paymentRouter);
router.use('/daily-reward', dailyRewardRoutes);
router.use('/achievements', achievementRoutes);
router.use('/arcs', arcRoutes);
router.use('/energy', energyRoutes);
router.use('/social-stats', socialStatsRoutes);
router.use('/events', eventRoutes);

// Public config endpoint for frontend dynamic premium plans
router.get('/config/tier-plans', async (_: Request, res: Response, next: (err: Error) => void) => {
  try {
    const configs = await getAllTierConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    next(new AppError('Failed to load tier plans', 500, 'TIER_PLANS_ERROR'));
  }
});

// API info
router.get('/', (_: Request, res: Response) => {
  res.json({
    name: 'Amoura API',
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
      '/api/analytics',
      '/api/dm',
      '/api/leaderboard',
      '/api/admin',
      '/api/daily-reward',
      '/api/achievements',
      '/api/arcs',
      '/api/config/tier-plans',
    ],
  });
});
