import { Router } from 'express';
import { authController } from './auth.controller';
import { passwordResetController } from './password-reset.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const authRouter = Router();

// Public routes
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refreshToken);

// Password reset routes
authRouter.post('/forgot-password', passwordResetController.forgotPassword);
authRouter.post('/verify-otp', passwordResetController.verifyOTP);
authRouter.post('/reset-password', passwordResetController.resetPassword);

// Protected routes
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/me', authenticate, authController.getMe);
authRouter.post('/change-password', authenticate, authController.changePassword);
