import { prisma } from '../../lib/prisma';
import { emailService } from '../../lib/email';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('PasswordReset');

export const passwordResetService = {
  /**
   * Generate 6-digit OTP
   */
  generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  },

  /**
   * Send OTP to email for password reset
   */
  async sendResetOTP(email: string): Promise<{ success: boolean; message: string }> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'Nếu email tồn tại, mã OTP đã được gửi',
      };
    }

    // Generate OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate old OTPs for this email
    await prisma.passwordResetOTP.updateMany({
      where: {
        email: email.toLowerCase(),
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Save new OTP
    await prisma.passwordResetOTP.create({
      data: {
        email: email.toLowerCase(),
        otp,
        expiresAt,
      },
    });

    // Send email
    const sent = await emailService.sendOTP(email, otp);

    if (!sent) {
      throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
    }

    return {
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn',
    };
  },

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string; token?: string }> {
    log.debug('Verify OTP attempt:', { email, otp });

    const otpRecord = await prisma.passwordResetOTP.findFirst({
      where: {
        email: email.toLowerCase(),
        otp,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    log.debug('OTP record found:', otpRecord ? 'YES' : 'NO');

    if (!otpRecord) {
      // Debug: Check if OTP exists but is used or wrong email
      const usedOtp = await prisma.passwordResetOTP.findFirst({
        where: { otp, used: true },
        orderBy: { createdAt: 'desc' },
      });
      
      if (usedOtp) {
        log.debug('OTP already used:', usedOtp.email);
        return {
          success: false,
          message: 'Mã OTP đã được sử dụng. Vui lòng yêu cầu mã mới.',
        };
      }

      return {
        success: false,
        message: 'Mã OTP không hợp lệ',
      };
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      log.debug('OTP expired');
      return {
        success: false,
        message: 'Mã OTP đã hết hạn',
      };
    }

    // Mark as used
    await prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Generate temporary reset token (valid for 5 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate old tokens for this email
    await prisma.passwordResetToken.updateMany({
      where: {
        email: email.toLowerCase(),
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Store reset token in dedicated table
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token: resetToken,
        expiresAt: tokenExpiry,
        used: false,
      },
    });

    return {
      success: true,
      message: 'Mã OTP xác thực thành công',
      token: resetToken,
    };
  },

  /**
   * Reset password with token
   */
  async resetPassword(email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Verify reset token from dedicated table
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        email: email.toLowerCase(),
        token,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!tokenRecord) {
      return {
        success: false,
        message: 'Token không hợp lệ',
      };
    }

    if (new Date() > tokenRecord.expiresAt) {
      return {
        success: false,
        message: 'Token đã hết hạn',
      };
    }

    // Hash new password (12 rounds, consistent with auth.service)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    });

    // Send confirmation email
    await emailService.sendPasswordResetSuccess(email);

    return {
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công',
    };
  },

  /**
   * Cleanup expired OTPs and tokens (run periodically)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    const now = new Date();

    await Promise.all([
      prisma.passwordResetOTP.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
    ]);
  },
};
