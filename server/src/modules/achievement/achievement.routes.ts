import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { achievementService } from './achievement.service';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('AchievementRoutes');
const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    const achievements = await achievementService.getAllAchievements(req.user!.id, category as string);
    res.json(achievements);
  } catch (err) {
    log.error('Get achievements failed:', err);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

router.get('/points', authenticate, async (req, res) => {
  try {
    const points = await achievementService.getAchievementPoints(req.user!.id);
    res.json({ points });
  } catch (err) {
    log.error('Get achievement points failed:', err);
    res.status(500).json({ error: 'Failed to get achievement points' });
  }
});

router.post('/:id/claim', authenticate, async (req, res) => {
  try {
    const result = await achievementService.claimAchievement(req.user!.id, req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    log.error('Claim achievement failed:', err);
    res.status(500).json({ error: 'Failed to claim achievement' });
  }
});

export { router as achievementRoutes };
