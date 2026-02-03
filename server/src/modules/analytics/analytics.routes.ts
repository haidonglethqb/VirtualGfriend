import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Require auth for all routes
router.use(authenticate);

// Get full character analytics
router.get('/', analyticsController.getCharacterAnalytics);

// Get simple dashboard stats
router.get('/stats', analyticsController.getDashboardStats);

export default router;
