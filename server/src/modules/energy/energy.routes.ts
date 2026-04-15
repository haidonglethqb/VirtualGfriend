import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { energyService } from './energy.service';
import { createModuleLogger } from '../../lib/logger';
import { z } from 'zod';

const log = createModuleLogger('EnergyRoutes');
const router = Router();
const itemSchema = z.object({ itemId: z.enum(['cafe', 'soda', 'meal']) });

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await energyService.getEnergyStatus(req.user!.id);
    res.json(status);
  } catch (err) {
    log.error('Get energy status failed:', err);
    res.status(500).json({ error: 'Failed to get energy status' });
  }
});

router.post('/use-item', authenticate, async (req, res) => {
  try {
    const parsed = itemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid item' });
    const result = await energyService.useEnergyItem(req.user!.id, parsed.data.itemId);
    if (!result.success) return res.status(400).json({ error: result.reason });
    res.json(result);
  } catch (err) {
    log.error('Use energy item failed:', err);
    res.status(500).json({ error: 'Failed to use item' });
  }
});

export { router as energyRoutes };
