import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { arcService } from './arc.service';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('ArcRoutes');
const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const arcs = await arcService.getAllArcs(req.user!.id);
    res.json(arcs);
  } catch (err) {
    log.error('Get arcs failed:', err);
    res.status(500).json({ error: 'Failed to get arcs' });
  }
});

router.get('/progress', authenticate, async (req, res) => {
  try {
    const progress = await arcService.getArcProgress(req.user!.id);
    res.json(progress);
  } catch (err) {
    log.error('Get arc progress failed:', err);
    res.status(500).json({ error: 'Failed to get arc progress' });
  }
});

router.get('/titles', authenticate, async (req, res) => {
  try {
    const titles = await arcService.getTitles(req.user!.id);
    res.json(titles);
  } catch (err) {
    log.error('Get titles failed:', err);
    res.status(500).json({ error: 'Failed to get titles' });
  }
});

router.post('/titles/:id/equip', authenticate, async (req, res) => {
  try {
    const result = await arcService.equipTitle(req.user!.id, req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    log.error('Equip title failed:', err);
    res.status(500).json({ error: 'Failed to equip title' });
  }
});

export { router as arcRoutes };
