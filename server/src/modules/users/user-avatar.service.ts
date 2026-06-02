import { prisma, PremiumTier } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { getTierConfig } from '../admin/tier-config.service';
import { uploadService } from '../upload/upload.service';
import { cache, CacheKeys } from '../../lib/redis';

function buildLimits(used: number, max: number) {
  const isUnlimited = max === -1;
  return {
    used,
    max,
    canUpload: isUnlimited || used < max,
    isUnlimited,
  };
}

async function invalidateUser(userId: string) {
  await cache.del(CacheKeys.user(userId), CacheKeys.userAuth(userId));
}

export const userAvatarService = {
  async list(userId: string, tier: PremiumTier) {
    const [user, uploadedAvatars, tierConfig] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      }),
      prisma.userAvatar.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      }),
      getTierConfig(tier),
    ]);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      activeAvatarUrl: user.avatar,
      defaultAvatars: uploadService.getDefaultUserAvatars(),
      uploadedAvatars,
      limits: buildLimits(uploadedAvatars.length, tierConfig.maxUserAvatars),
    };
  },

  async upload(userId: string, tier: PremiumTier, file?: Express.Multer.File) {
    if (!file) {
      throw new AppError('No file provided', 400, 'NO_FILE');
    }

    const validationError = uploadService.validateFile(file);
    if (validationError) {
      throw new AppError(validationError, 400, 'VALIDATION_ERROR');
    }

    const [used, tierConfig] = await Promise.all([
      prisma.userAvatar.count({ where: { userId } }),
      getTierConfig(tier),
    ]);
    const limits = buildLimits(used, tierConfig.maxUserAvatars);
    if (!limits.canUpload) {
      throw new AppError('Profile avatar upload quota reached', 403, 'USER_AVATAR_QUOTA_REACHED');
    }

    const uploaded = await uploadService.uploadUserAvatar(file, userId);
    try {
      const avatar = await prisma.$transaction(async (tx) => {
        const created = await tx.userAvatar.create({
          data: {
            userId,
            url: uploaded.url,
            objectKey: uploaded.objectKey,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { avatar: created.url },
        });

        return created;
      });

      await invalidateUser(userId);
      return avatar;
    } catch (error) {
      await uploadService.deleteByObjectKey(uploaded.objectKey);
      throw error;
    }
  },

  async selectDefault(userId: string, url: string) {
    if (!uploadService.isDefaultUserAvatarUrl(url)) {
      throw new AppError('Invalid default avatar', 400, 'INVALID_DEFAULT_AVATAR');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
      select: { avatar: true },
    });

    await invalidateUser(userId);
    return { activeAvatarUrl: updated.avatar };
  },

  async selectUploaded(userId: string, avatarId: string) {
    const avatar = await prisma.userAvatar.findFirst({
      where: { id: avatarId, userId },
      select: { url: true },
    });

    if (!avatar) {
      throw new AppError('Avatar not found', 404, 'USER_AVATAR_NOT_FOUND');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatar.url },
    });

    await invalidateUser(userId);
    return { activeAvatarUrl: avatar.url };
  },

  async delete(userId: string, avatarId: string) {
    const avatar = await prisma.userAvatar.findFirst({
      where: { id: avatarId, userId },
      select: { id: true, url: true, objectKey: true },
    });

    if (!avatar) {
      throw new AppError('Avatar not found', 404, 'USER_AVATAR_NOT_FOUND');
    }

    const fallback = uploadService.getDefaultUserAvatars()[0]?.url || null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.userAvatar.delete({ where: { id: avatar.id } });
      if (user?.avatar === avatar.url) {
        await tx.user.update({
          where: { id: userId },
          data: { avatar: fallback },
        });
      }
    });

    await uploadService.deleteByObjectKey(avatar.objectKey);
    await invalidateUser(userId);

    return { activeAvatarUrl: user?.avatar === avatar.url ? fallback : user?.avatar || null };
  },
};
