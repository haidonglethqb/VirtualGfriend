import { Router } from 'express';
import multer from 'multer';
import { userController } from './users.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { attachPremiumInfo } from '../../middlewares/premium.middleware';

export const userRouter = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// All routes require authentication
userRouter.use(authenticate);

userRouter.get('/avatars', userController.getAvatars);
userRouter.post('/avatars/upload', avatarUpload.single('file'), userController.uploadAvatar);
userRouter.post('/avatars/select-default', userController.selectDefaultAvatar);
userRouter.post('/avatars/:id/select', userController.selectUploadedAvatar);
userRouter.delete('/avatars/:id', userController.deleteAvatar);
userRouter.get('/profile', userController.getProfile);
userRouter.patch('/profile', userController.updateProfile);
userRouter.get('/settings', userController.getSettings);
userRouter.patch('/settings', userController.updateSettings);
userRouter.get('/privacy', userController.getPrivacySettings);
userRouter.patch('/privacy', userController.updatePrivacySettings);
userRouter.get('/stats', userController.getStats);
userRouter.get('/notifications', userController.getNotifications);
userRouter.post('/notifications/read', userController.markNotificationsRead);

// Premium status endpoint
userRouter.get('/premium-status', attachPremiumInfo, userController.getPremiumStatus);
