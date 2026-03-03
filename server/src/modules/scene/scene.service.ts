import { prisma, RelationshipStage, PremiumTier } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { RELATIONSHIP_THRESHOLDS, SCENE_PROGRESSION, PREMIUM_FEATURES } from '../../lib/constants';

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
    const userTier = user?.premiumTier || 'FREE';

    return scenes.map((scene) => {
      const isManuallyUnlocked = unlockedSceneIds.has(scene.id);
      const stageReached = scene.requiredStage ? isStageReached(currentStage, scene.requiredStage as RelationshipStage) : true;
      const premiumOk = !scene.requiresPremium || user?.isPremium || userTier !== 'FREE';
      
      return {
        ...scene,
        isUnlocked: scene.isDefault || isManuallyUnlocked || (stageReached && premiumOk),
        isLocked: !scene.isDefault && !isManuallyUnlocked && (!stageReached || !premiumOk),
        lockReason: !stageReached ? `Yêu cầu giai đoạn: ${scene.requiredStage}` : 
                   !premiumOk ? 'Yêu cầu gói Premium' : null,
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
        select: { id: true, affection: true },
      }),
    ]);

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const currentStage = getRelationshipStage(character.affection);
    const allowedStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(currentStage) + 1);
    const isPremium = user?.isPremium || (user?.premiumTier && user.premiumTier !== 'FREE');

    // Single query with OR: default scenes OR unlocked scenes OR stage-allowed scenes
    return prisma.scene.findMany({
      where: {
        isActive: true,
        OR: [
          { isDefault: true },
          { characterScenes: { some: { characterId: character.id } } },
          { 
            AND: [
              { requiredStage: { in: allowedStages } },
              isPremium ? {} : { requiresPremium: false },
            ]
          },
        ],
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
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
      const isPremium = user?.isPremium || (user?.premiumTier && user.premiumTier !== 'FREE');
      if (!isPremium) {
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
      const isPremium = user?.isPremium || (user?.premiumTier && user.premiumTier !== 'FREE');
      if (!isPremium) {
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

      // If not manually unlocked, check if stage allows it
      if (!unlocked && scene.requiredStage) {
        const currentStage = getRelationshipStage(character.affection);
        if (!isStageReached(currentStage, scene.requiredStage as RelationshipStage)) {
          throw new AppError('Scene not unlocked', 400, 'SCENE_NOT_UNLOCKED');
        }
      } else if (!unlocked) {
        throw new AppError('Scene not unlocked', 400, 'SCENE_NOT_UNLOCKED');
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

    const isPremium = user?.isPremium || (user?.premiumTier && user.premiumTier !== 'FREE');

    // Get scenes that require exactly this stage
    const scenes = await prisma.scene.findMany({
      where: {
        isActive: true,
        requiredStage: newStage,
        ...(isPremium ? {} : { requiresPremium: false }),
      },
    });

    return scenes;
  },
};
