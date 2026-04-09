import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { passwordResetService } from './password-reset.service';
import { AppError } from '../../middlewares/error.middleware';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

const verifyOTPSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  otp: z.string().length(6, 'Mã OTP phải có 6 số'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  token: z.string().min(1, 'Token là bắt buộc'),
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const passwordResetController = {
  /**
   * POST /api/auth/forgot-password
   * Send OTP to email
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const result = await passwordResetService.sendResetOTP(email);

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR');
      }
      next(error);
    }
  },

  /**
   * POST /api/auth/verify-otp
   * Verify OTP and get reset token
   */
  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = verifyOTPSchema.parse(req.body);

      const result = await passwordResetService.verifyOTP(email, otp);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Return token in data field for consistency with API response structure
      res.json({
        success: true,
        message: result.message,
        data: { token: result.token },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR');
      }
      next(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, token, newPassword } = resetPasswordSchema.parse(req.body);

      const result = await passwordResetService.resetPassword(email, token, newPassword);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR');
      }
      next(error);
    }
  },
};
