import { Router } from 'express';
import { adminAuth } from './admin.middleware';
import { uploadRouter } from '../upload/upload.routes';
import {
  adminLogin,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getCharacters,
  getCharacter,
  updateCharacter,
  deleteCharacter,
  getStats,
  resetUserPassword,
  getQuests,
  createQuest,
  updateQuest,
  deleteQuest,
  toggleQuestActive,
  getCharacterTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  getMessages,
  deleteMessage,
  deleteMessagesBulk,
  giveCoinsToAll,
  giveGemsToAll,
  giveToUser,
  getAnalytics,
  getSystemInfo,
  cleanupData,
  broadcastNotification,
  getGiftHistory,
  getMemories,
  deleteMemory,
  cleanupDuplicateTemplates,
  fixMissingAvatars,
} from './admin.controller';
import { getTierConfigs, updateTierConfigHandler } from './admin-tier-config.controller';
import { getAdminPricing, updateAdminPricing } from './admin-pricing.controller';

const router = Router();

// Public: Admin login
router.post('/login', adminLogin);

// Protected routes - require admin auth
router.use(adminAuth);

// Dashboard & Analytics
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.get('/system', getSystemInfo);

// Users management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/:id/give', giveToUser);

// Characters management
router.get('/characters', getCharacters);
router.get('/characters/:id', getCharacter);
router.patch('/characters/:id', updateCharacter);
router.delete('/characters/:id', deleteCharacter);

// Messages management
router.get('/messages', getMessages);
router.delete('/messages/:id', deleteMessage);
router.post('/messages/bulk-delete', deleteMessagesBulk);

// Quests management
router.get('/quests', getQuests);
router.post('/quests', createQuest);
router.patch('/quests/:id', updateQuest);
router.delete('/quests/:id', deleteQuest);
router.post('/quests/:id/toggle', toggleQuestActive);

// Character templates management
router.get('/templates', getCharacterTemplates);
router.post('/templates', createTemplate);
router.patch('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);
router.post('/templates/:id/toggle', toggleTemplateActive);

// Bulk actions
router.post('/bulk/coins', giveCoinsToAll);
router.post('/bulk/gems', giveGemsToAll);

// System
router.post('/cleanup', cleanupData);
router.post('/broadcast', broadcastNotification);

// Gift history
router.get('/gifts', getGiftHistory);

// Memories
router.get('/memories', getMemories);
router.delete('/memories/:id', deleteMemory);

// Cleanup utilities
router.post('/cleanup/duplicate-templates', cleanupDuplicateTemplates);
router.get('/cleanup/check-avatars', fixMissingAvatars);

// Tier config management
router.get('/tier-configs', getTierConfigs);
router.put('/tier-configs/:tier', updateTierConfigHandler);

// Pricing management (Stripe)
router.get('/pricing', getAdminPricing);
router.put('/pricing/:tier', updateAdminPricing);

// File upload (DO Spaces)
router.use('/upload', uploadRouter);

export { router as adminRouter };
