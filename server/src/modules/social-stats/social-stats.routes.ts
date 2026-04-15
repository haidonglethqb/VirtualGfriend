import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { socialStatsService } from './social-stats.service';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('SocialStatsRoutes');
const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const stats = await socialStatsService.getStats(req.user!.id);
    res.json(stats);
  } catch (err) {
    log.error('Get social stats failed:', err);
    res.status(500).json({ error: 'Failed to get social stats' });
  }
});

export { router as socialStatsRoutes };
