import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { dailyRewardService } from './daily-reward.service';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('DailyRewardRoutes');
const router = Router();

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await dailyRewardService.getDailyRewardStatus(req.user!.id);
    res.json(status);
  } catch (err) {
    log.error('Get daily reward status failed:', err);
    res.status(500).json({ error: 'Failed to get daily reward status' });
  }
});

router.post('/claim', authenticate, async (req, res) => {
  try {
    const result = await dailyRewardService.claimDailyReward(req.user!.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err.code === 'ALREADY_CLAIMED') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    log.error('Claim daily reward failed:', err);
    res.status(500).json({ error: 'Failed to claim daily reward' });
  }
});

export { router as dailyRewardRoutes };
