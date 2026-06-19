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
  giveBulkRewards,
  previewBulkRewards,
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
import { getAdminPricing, getStripeLivePricing, updateAdminPricing, syncStripePrice } from './admin-pricing.controller';
import { getAdminGiftCatalog, getAdminVipGiftPack, updateAdminVipGiftPack } from './admin-vip-pack.controller';
import { clearAiDebugSettings, getAiDebugSettings, getAiSettings, testAiSettings, updateAiSettingsContext, updateAiSettingsKey, updateAiSettingsProvider } from './admin-ai-settings.controller';

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
router.post('/bulk/rewards/preview', previewBulkRewards);
router.post('/bulk/rewards', giveBulkRewards);

// System
router.post('/cleanup', cleanupData);
router.post('/broadcast', broadcastNotification);

// Gift history
router.get('/gifts', getGiftHistory);
router.get('/gift-catalog', getAdminGiftCatalog);
router.get('/vip-gift-pack', getAdminVipGiftPack);
router.put('/vip-gift-pack', updateAdminVipGiftPack);

// Memories
router.get('/memories', getMemories);
router.delete('/memories/:id', deleteMemory);

// Cleanup utilities
router.post('/cleanup/duplicate-templates', cleanupDuplicateTemplates);
router.get('/cleanup/check-avatars', fixMissingAvatars);

// Tier config management
router.get('/tier-configs', getTierConfigs);
router.put('/tier-configs/:tier', updateTierConfigHandler);

// AI runtime settings
router.get('/ai-settings', getAiSettings);
router.get('/ai-settings/debug', getAiDebugSettings);
router.delete('/ai-settings/debug', clearAiDebugSettings);
router.put('/ai-settings/provider', updateAiSettingsProvider);
router.put('/ai-settings/context', updateAiSettingsContext);
router.put('/ai-settings/keys/:provider', updateAiSettingsKey);
router.post('/ai-settings/test', testAiSettings);

// Pricing management (Stripe)
router.get('/pricing', getAdminPricing);
router.get('/pricing/stripe-live', getStripeLivePricing); // must be before /:tier
router.put('/pricing/:tier', updateAdminPricing);
router.post('/pricing/:tier/sync-stripe', syncStripePrice);

// File upload (DO Spaces)
router.use('/upload', uploadRouter);

export { router as adminRouter };
