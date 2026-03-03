import { Router } from 'express';
import { adminAuth } from './admin.middleware';
import {
  adminLogin,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getCharacters,
  getStats,
  resetUserPassword,
  getQuests,
  getCharacterTemplates,
} from './admin.controller';

const router = Router();

// Public: Admin login
router.post('/login', adminLogin);

// Protected routes - require admin auth
router.use(adminAuth);

// Dashboard stats
router.get('/stats', getStats);

// Users management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

// Characters
router.get('/characters', getCharacters);

// Quests
router.get('/quests', getQuests);

// Character templates
router.get('/templates', getCharacterTemplates);

export { router as adminRouter };
