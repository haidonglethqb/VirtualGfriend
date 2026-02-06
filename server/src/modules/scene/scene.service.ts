import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export const sceneService = {
  async getAllScenes(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
      include: {
        scenes: { select: { sceneId: true } },
      },
    });

    const unlockedSceneIds = new Set(character?.scenes.map((s) => s.sceneId) || []);

    const scenes = await prisma.scene.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    return scenes.map((scene) => ({
      ...scene,
      isUnlocked: scene.isDefault || unlockedSceneIds.has(scene.id),
    }));
  },

  async getUnlockedScenes(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const [defaultScenes, unlockedScenes] = await Promise.all([
      prisma.scene.findMany({ where: { isDefault: true, isActive: true } }),
      prisma.characterScene.findMany({
        where: { characterId: character.id },
        include: { scene: true },
      }),
    ]);

    return [
      ...defaultScenes,
      ...unlockedScenes.map((us) => us.scene),
    ];
  },

  async unlockScene(userId: string, sceneId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
    });

    if (!scene) {
      throw new AppError('Scene not found', 404, 'SCENE_NOT_FOUND');
    }

    // Check if already unlocked
    const existing = await prisma.characterScene.findUnique({
      where: { characterId_sceneId: { characterId: character.id, sceneId } },
    });

    if (existing || scene.isDefault) {
      throw new AppError('Scene already unlocked', 400, 'SCENE_ALREADY_UNLOCKED');
    }

    // Check unlock requirements
    if (scene.unlockMethod === 'level' && character.level < scene.unlockValue) {
      throw new AppError(
        `Level ${scene.unlockValue} required`,
        400,
        'LEVEL_REQUIRED'
      );
    }

    if (scene.unlockMethod === 'purchase' && scene.priceGems > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || user.gems < scene.priceGems) {
        throw new AppError('Not enough gems', 400, 'INSUFFICIENT_GEMS');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { gems: { decrement: scene.priceGems } },
      });
    }

    await prisma.characterScene.create({
      data: { characterId: character.id, sceneId },
    });

    return { scene, unlocked: true };
  },

  async setActiveScene(userId: string, sceneId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    // Verify scene is unlocked
    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    
    if (!scene) {
      throw new AppError('Scene not found', 404, 'SCENE_NOT_FOUND');
    }

    if (!scene.isDefault) {
      const unlocked = await prisma.characterScene.findUnique({
        where: { characterId_sceneId: { characterId: character.id, sceneId } },
      });

      if (!unlocked) {
        throw new AppError('Scene not unlocked', 400, 'SCENE_NOT_UNLOCKED');
      }
    }

    // Could store active scene in character or user settings
    // Persist active scene to user settings
    await prisma.userSettings.upsert({
      where: { userId },
      update: { activeSceneId: sceneId },
      create: { userId, activeSceneId: sceneId },
    });

    return { scene, active: true };
  },
};
