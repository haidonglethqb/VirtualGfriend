import { prisma, RelationshipStage, PremiumTier } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { RELATIONSHIP_THRESHOLDS, SCENE_PROGRESSION } from '../../lib/constants';
import { getTierConfig, PremiumTier as ConfigPremiumTier } from '../admin/tier-config.service';

// Scenes rarely change, cache for 1 hour
const SCENE_CACHE_TTL = 3600;

// Helper to determine relationship stage from affection
function getRelationshipStage(affection: number): RelationshipStage {
  if (affection >= RELATIONSHIP_THRESHOLDS.LOVER) return 'LOVER';
  if (affection >= RELATIONSHIP_THRESHOLDS.IN_LOVE) return 'IN_LOVE';
  if (affection >= RELATIONSHIP_THRESHOLDS.DATING) return 'DATING';
  if (affection >= RELATIONSHIP_THRESHOLDS.CRUSH) return 'CRUSH';
  if (affection >= RELATIONSHIP_THRESHOLDS.CLOSE_FRIEND) return 'CLOSE_FRIEND';
  if (affection >= RELATIONSHIP_THRESHOLDS.FRIEND) return 'FRIEND';
  if (affection >= RELATIONSHIP_THRESHOLDS.ACQUAINTANCE) return 'ACQUAINTANCE';
  return 'STRANGER';
}

// Stage progression order for comparison
const STAGE_ORDER: RelationshipStage[] = [
  'STRANGER', 'ACQUAINTANCE', 'FRIEND', 'CLOSE_FRIEND', 'CRUSH', 'DATING', 'IN_LOVE', 'LOVER'
];

function isStageReached(currentStage: RelationshipStage, requiredStage: RelationshipStage): boolean {
  return STAGE_ORDER.indexOf(currentStage) >= STAGE_ORDER.indexOf(requiredStage);
}

function getSceneLockState(params: {
  isDefault: boolean;
  isManuallyUnlocked: boolean;
  stageReached: boolean;
  premiumOk: boolean;
  unlockMethod: string;
  unlockValue: number;
  characterLevel: number;
  requiredStage: string | null;
}) {
  const {
    isDefault,
    isManuallyUnlocked,
    stageReached,
    premiumOk,
    unlockMethod,
    unlockValue,
    characterLevel,
    requiredStage,
  } = params;

  if (isDefault || isManuallyUnlocked) {
    return { isUnlocked: true, lockReason: null as string | null };
  }

  if (!stageReached) {
    return { isUnlocked: false, lockReason: `Yeu cau giai doan: ${requiredStage}` };
  }

  if (!premiumOk) {
    return { isUnlocked: false, lockReason: 'Yeu cau goi Premium' };
  }

  if (unlockMethod === 'level') {
    if (characterLevel < unlockValue) {
      return { isUnlocked: false, lockReason: `Yeu cau level ${unlockValue}` };
    }
    return { isUnlocked: true, lockReason: null };
  }

  if (unlockMethod === 'purchase') {
    return { isUnlocked: false, lockReason: 'Can mo khoa bang gems' };
  }

  return { isUnlocked: true, lockReason: null };
}

async function canAccessPremiumScenesByTier(
  tier: PremiumTier | null | undefined,
  isPremiumFlag?: boolean | null,
): Promise<boolean> {
  const resolvedTier = (tier || (isPremiumFlag ? 'BASIC' : 'FREE')) as ConfigPremiumTier;
  const config = await getTierConfig(resolvedTier);
  return config.canAccessPremiumScenes;
}

export const sceneService = {
  async getAllScenes(userId: string) {
    // Parallel: get user (for premium), character + all scenes at the same time
    const [user, character, scenes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, premiumTier: true },
      }),
      prisma.character.findFirst({
        where: { userId, isActive: true },
        include: {
          scenes: { select: { sceneId: true } },
        },
      }),
      cache.getOrSet(
        'scenes:all_active',
        () => prisma.scene.findMany({
          where: { isActive: true },
          orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        }),
        SCENE_CACHE_TTL,
      ),
    ]);

    const unlockedSceneIds = new Set(character?.scenes.map((s) => s.sceneId) || []);
    const currentStage = character ? getRelationshipStage(character.affection) : 'STRANGER';
    const characterLevel = character?.level ?? 1;
    const canAccessPremiumScenes = await canAccessPremiumScenesByTier(user?.premiumTier, user?.isPremium);

    return scenes.map((scene) => {
      const isManuallyUnlocked = unlockedSceneIds.has(scene.id);
      const stageReached = scene.requiredStage ? isStageReached(currentStage, scene.requiredStage as RelationshipStage) : true;
      const premiumOk = !scene.requiresPremium || canAccessPremiumScenes;
      const lockState = getSceneLockState({
        isDefault: scene.isDefault,
        isManuallyUnlocked,
        stageReached,
        premiumOk,
        unlockMethod: scene.unlockMethod,
        unlockValue: scene.unlockValue,
        characterLevel,
        requiredStage: scene.requiredStage,
      });
      
      return {
        ...scene,
        isUnlocked: lockState.isUnlocked,
        isLocked: !lockState.isUnlocked,
        lockReason: lockState.lockReason,
        currentStage,
        requiredStage: scene.requiredStage,
      };
    });
  },

  // Get available scenes based on relationship stage
  async getAvailableScenesByStage(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const currentStage = getRelationshipStage(character.affection);
    const allowedCategories = SCENE_PROGRESSION[currentStage] || [];

    const scenes = await prisma.scene.findMany({
      where: {
        isActive: true,
        OR: [
          { isDefault: true },
          { requiredStage: { in: STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(currentStage) + 1) } },
          { category: { in: [...allowedCategories] } },
        ],
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    return {
      scenes,
      currentStage,
      unlockedCategories: allowedCategories,
    };
  },

  async getUnlockedScenes(userId: string) {
    const [user, character] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, premiumTier: true },
      }),
      prisma.character.findFirst({
        where: { userId, isActive: true },
        include: {
          scenes: { select: { sceneId: true } },
        },
      }),
    ]);

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const currentStage = getRelationshipStage(character.affection);
    const characterLevel = character.level;
    const canAccessPremiumScenes = await canAccessPremiumScenesByTier(user?.premiumTier, user?.isPremium);
    const unlockedSceneIds = new Set(character.scenes.map((s) => s.sceneId));

    const scenes = await cache.getOrSet(
      'scenes:all_active',
      () => prisma.scene.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      SCENE_CACHE_TTL,
    );

    return scenes.filter((scene) => {
      const isManuallyUnlocked = unlockedSceneIds.has(scene.id);
      const stageReached = scene.requiredStage ? isStageReached(currentStage, scene.requiredStage as RelationshipStage) : true;
      const premiumOk = !scene.requiresPremium || canAccessPremiumScenes;
      const lockState = getSceneLockState({
        isDefault: scene.isDefault,
        isManuallyUnlocked,
        stageReached,
        premiumOk,
        unlockMethod: scene.unlockMethod,
        unlockValue: scene.unlockValue,
        characterLevel,
        requiredStage: scene.requiredStage,
      });
      return lockState.isUnlocked;
    });
  },

  async unlockScene(userId: string, sceneId: string) {
    const [user, character] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { gems: true, isPremium: true, premiumTier: true },
      }),
      prisma.character.findFirst({
        where: { userId, isActive: true },
      }),
    ]);

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

    // Check premium requirement
    if (scene.requiresPremium) {
      const canAccessPremiumScenes = await canAccessPremiumScenesByTier(user?.premiumTier, user?.isPremium);
      if (!canAccessPremiumScenes) {
        throw new AppError('Premium subscription required for this scene', 403, 'PREMIUM_REQUIRED');
      }
    }

    // Check relationship stage requirement
    if (scene.requiredStage) {
      const currentStage = getRelationshipStage(character.affection);
      if (!isStageReached(currentStage, scene.requiredStage as RelationshipStage)) {
        throw new AppError(
          `Relationship stage ${scene.requiredStage} required. Current: ${currentStage}`,
          400,
          'STAGE_REQUIRED'
        );
      }
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
      if (!user || user.gems < scene.priceGems) {
        throw new AppError('Not enough gems', 400, 'INSUFFICIENT_GEMS');
      }

      // Use transaction to ensure atomicity: deduct gems + create unlock together
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { gems: { decrement: scene.priceGems } },
        }),
        prisma.characterScene.create({
          data: { characterId: character.id, sceneId },
        }),
      ]);

      return { scene, unlocked: true };
    }

    await prisma.characterScene.create({
      data: { characterId: character.id, sceneId },
    });

    return { scene, unlocked: true };
  },

  async setActiveScene(userId: string, sceneId: string) {
    const [user, character] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, premiumTier: true },
      }),
      prisma.character.findFirst({
        where: { userId, isActive: true },
      }),
    ]);

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    // Verify scene exists
    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    
    if (!scene) {
      throw new AppError('Scene not found', 404, 'SCENE_NOT_FOUND');
    }

    // Check premium requirement
    if (scene.requiresPremium) {
      const canAccessPremiumScenes = await canAccessPremiumScenesByTier(user?.premiumTier, user?.isPremium);
      if (!canAccessPremiumScenes) {
        throw new AppError('Premium subscription required for this scene', 403, 'PREMIUM_REQUIRED');
      }
    }

    // Check relationship stage requirement
    if (scene.requiredStage) {
      const currentStage = getRelationshipStage(character.affection);
      if (!isStageReached(currentStage, scene.requiredStage as RelationshipStage)) {
        throw new AppError(
          `Relationship stage ${scene.requiredStage} required`,
          400,
          'STAGE_REQUIRED'
        );
      }
    }

    if (!scene.isDefault) {
      const unlocked = await prisma.characterScene.findUnique({
        where: { characterId_sceneId: { characterId: character.id, sceneId } },
      });
      const currentStage = getRelationshipStage(character.affection);
      const stageReached = scene.requiredStage ? isStageReached(currentStage, scene.requiredStage as RelationshipStage) : true;
      const canAccessPremiumScenes = await canAccessPremiumScenesByTier(user?.premiumTier, user?.isPremium);
      const premiumOk = !scene.requiresPremium || canAccessPremiumScenes;
      const lockState = getSceneLockState({
        isDefault: scene.isDefault,
        isManuallyUnlocked: Boolean(unlocked),
        stageReached,
        premiumOk,
        unlockMethod: scene.unlockMethod,
        unlockValue: scene.unlockValue,
        characterLevel: character.level,
        requiredStage: scene.requiredStage,
      });

      if (!lockState.isUnlocked) {
        throw new AppError(lockState.lockReason || 'Scene not unlocked', 400, 'SCENE_NOT_UNLOCKED');
      }
    }

    // Persist active scene to user settings
    await prisma.userSettings.upsert({
      where: { userId },
      update: { activeSceneId: sceneId },
      create: { userId, activeSceneId: sceneId },
    });

    return { scene, active: true };
  },

  // Get scenes newly unlocked by reaching a relationship stage
  async getNewlyUnlockedScenes(userId: string, newStage: RelationshipStage) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumTier: true },
    });

    const canAccessPremiumScenes = await canAccessPremiumScenesByTier(user?.premiumTier, user?.isPremium);

    // Get scenes that require exactly this stage
    const scenes = await prisma.scene.findMany({
      where: {
        isActive: true,
        requiredStage: newStage,
        ...(canAccessPremiumScenes ? {} : { requiresPremium: false }),
      },
    });

    return scenes;
  },
};
