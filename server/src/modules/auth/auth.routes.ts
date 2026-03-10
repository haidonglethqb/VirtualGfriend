import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { passwordResetController } from './password-reset.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const authRouter = Router();

// Rate limiters for sensitive endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 in prod, 100 in dev
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  message: { success: false, message: 'Too many OTP requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts to verify OTP
  message: { success: false, message: 'Too many verification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
authRouter.post('/register', authController.register);
authRouter.post('/verify-registration', verifyOtpLimiter, authController.verifyRegistration);
authRouter.post('/resend-registration-otp', otpLimiter, authController.resendRegistrationOTP);
authRouter.post('/login', loginLimiter, authController.login);
authRouter.post('/refresh', authController.refreshToken);

// Password reset routes with rate limiting
authRouter.post('/forgot-password', otpLimiter, passwordResetController.forgotPassword);
authRouter.post('/verify-otp', verifyOtpLimiter, passwordResetController.verifyOTP);
authRouter.post('/reset-password', passwordResetController.resetPassword);

// Protected routes
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/me', authenticate, authController.getMe);
authRouter.post('/change-password', authenticate, authController.changePassword);
