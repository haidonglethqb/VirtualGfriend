import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { cache, CacheKeys } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { validatePassword } from '../../lib/constants';
import { passwordResetService } from './password-reset.service';

interface RegisterData {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
  userGender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'NOT_SPECIFIED';
  datingPreference?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'ALL';
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TOKEN_EXPIRES = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60; // 7 days in seconds

function generateTokens(userId: string, email: string): AuthTokens {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
  }

  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { userId, email, tokenId: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES,
  };
}

export const authService = {
  /**
   * Step 1: Validate registration data, store pending in Redis, send OTP
   */
  async register(data: RegisterData) {
    // Validate password
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new AppError(
        passwordValidation.errors.join('. '),
        400,
        'INVALID_PASSWORD'
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Check if username already exists
    if (data.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUsername) {
        throw new AppError('Username already taken', 400, 'USERNAME_EXISTS');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Store pending registration data in Redis (TTL 15 minutes)
    const pendingKey = `pending_registration:${data.email.toLowerCase().trim()}`;
    await cache.set(pendingKey, {
      email: data.email.toLowerCase().trim(),
      hashedPassword,
      username: data.username,
      displayName: data.displayName || data.username,
      userGender: data.userGender || 'NOT_SPECIFIED',
      datingPreference: data.datingPreference || 'ALL',
    }, 15 * 60); // 15 minutes

    // Send registration OTP
    await passwordResetService.sendRegistrationOTP(data.email.toLowerCase().trim());

    return { status: 'OTP_SENT', email: data.email.toLowerCase().trim() };
  },

  /**
   * Step 2: Verify OTP and complete registration
   */
  async verifyRegistration(email: string, otp: string) {
    // Verify OTP
    const otpResult = await passwordResetService.verifyRegistrationOTP(email, otp);
    if (!otpResult.success) {
      throw new AppError(otpResult.message, 400, 'INVALID_OTP');
    }

    // Get pending registration data from Redis
    const pendingKey = `pending_registration:${email.toLowerCase().trim()}`;
    const pendingData = await cache.get<{
      email: string;
      hashedPassword: string;
      username?: string;
      displayName?: string;
      userGender: string;
      datingPreference: string;
    }>(pendingKey);

    if (!pendingData) {
      throw new AppError(
        'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.',
        400,
        'REGISTRATION_EXPIRED'
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: pendingData.email,
        password: pendingData.hashedPassword,
        username: pendingData.username,
        displayName: pendingData.displayName || pendingData.username,
        userGender: pendingData.userGender as any,
        datingPreference: pendingData.datingPreference as any,
        isEmailVerified: true,
        coins: 100,
        gems: 10,
        settings: {
          create: {
            language: 'vi',
            theme: 'dark',
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isPremium: true,
        premiumTier: true,
        userGender: true,
        datingPreference: true,
        coins: true,
        gems: true,
        streak: true,
        bio: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES * 1000),
      },
    });

    // Cleanup pending data from Redis
    await cache.del(pendingKey);

    return { user, tokens };
  },

  async login(data: LoginData) {
    // Find user - need password for verification
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    console.log('[Auth] Login attempt:', { email: data.email, userFound: !!user });

    if (!user) {
      console.log('[Auth] User not found for email:', data.email);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    console.log('[Auth] Password check:', { isValid: isValidPassword });

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // Update last login + store refresh token in parallel
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES * 1000),
        },
      }),
    ]);

    // Return user data with consistent shape (same fields as register)
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      isPremium: user.isPremium,
      coins: user.coins,
      gems: user.gems,
      streak: user.streak,
      bio: user.bio,
      createdAt: user.createdAt,
    };

    return { user: userResponse, tokens };
  },

  async refreshToken(token: string) {
    // Verify token
    let decoded: { userId: string; email: string };
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET!
      ) as { userId: string; email: string };
    } catch {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Use a transaction to ensure atomicity and prevent race conditions
    // This prevents multiple simultaneous refresh requests from succeeding
    const result = await prisma.$transaction(async (tx) => {
      // Atomically find and revoke the token in one operation
      // This uses an atomic update with a conditional where clause
      const revokedTokens = await tx.refreshToken.updateMany({
        where: {
          token,
          isRevoked: false, // Only update if not already revoked
          expiresAt: { gt: new Date() }, // And not expired
        },
        data: { isRevoked: true },
      });

      // If no token was revoked, it means:
      // 1. Token doesn't exist, OR
      // 2. Token was already revoked (race condition - another request won), OR
      // 3. Token is expired
      if (revokedTokens.count === 0) {
        throw new AppError('Invalid or already used refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Get user data for response
      const user = await tx.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
          isEmailVerified: true,
          isPremium: true,
          premiumExpiresAt: true,
          coins: true,
          gems: true,
          streak: true,
          lastActiveAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate new tokens
      const tokens = generateTokens(decoded.userId, decoded.email);

      // Store new refresh token
      await tx.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: decoded.userId,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES * 1000),
        },
      });

      return { user, tokens };
    });

    return result;
  },

  async logout(token: string) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isPremium: true,
        premiumExpiresAt: true,
        coins: true,
        gems: true,
        streak: true,
        bio: true,
        lastLoginAt: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(
        passwordValidation.errors.join('. '),
        400,
        'INVALID_PASSWORD'
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    // Invalidate auth cache
    await cache.del(CacheKeys.userAuth(userId), CacheKeys.user(userId));
  },
};
