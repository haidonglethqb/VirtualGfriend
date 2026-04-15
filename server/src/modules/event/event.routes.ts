import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { eventService } from './event.service';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('EventRoutes');
const router = Router();

router.get('/active', authenticate, async (req, res) => {
  try {
    const events = await eventService.getActiveEvents();
    res.json(events);
  } catch (err) {
    log.error('Get active events failed:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const events = await eventService.getUpcomingEvents();
    res.json(events);
  } catch (err) {
    log.error('Get upcoming events failed:', err);
    res.status(500).json({ error: 'Failed to get upcoming events' });
  }
});

export { router as eventRoutes };
