import { Router } from 'express';
import { userController } from './users.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const userRouter = Router();

// All routes require authentication
userRouter.use(authenticate);

userRouter.get('/profile', userController.getProfile);
userRouter.patch('/profile', userController.updateProfile);
userRouter.get('/settings', userController.getSettings);
userRouter.patch('/settings', userController.updateSettings);
userRouter.get('/stats', userController.getStats);
userRouter.get('/notifications', userController.getNotifications);
userRouter.post('/notifications/read', userController.markNotificationsRead);
