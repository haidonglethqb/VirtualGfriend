import { prisma } from '../../lib/prisma';
import { cache, CacheKeys, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';
import { RelationshipStage, Gender } from '@prisma/client';
import { createModuleLogger } from '../../lib/logger';
import { VALIDATION } from '../../lib/constants';

const log = createModuleLogger('Character');

interface CreateCharacterData {
  name: string;
  nickname?: string;
  gender?: Gender;
  personality?: string;
  birthday?: string;
  bio?: string;
  age?: number;
  occupation?: string;
  templateId?: string;
  avatarUrl?: string;
}

interface UpdateCharacterData {
  name?: string;
  nickname?: string;
  personality?: string;
  bio?: string;
  responseStyle?: string;
  creativityLevel?: number;
  avatarUrl?: string;
  templateId?: string;
}

interface CustomizeCharacterData {
  avatarStyle?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  outfit?: string;
  accessories?: string[];
}

interface AddFactData {
  category: string;
  key: string;
  value: string;
  importance?: number;
}

// Affection thresholds for relationship stages
const RELATIONSHIP_THRESHOLDS: Record<RelationshipStage, number> = {
  STRANGER: 0,
  ACQUAINTANCE: 100,
  FRIEND: 250,
  CLOSE_FRIEND: 450,
  CRUSH: 600,
  DATING: 750,
  LOVER: 900,
};

// NEW: Level milestone rewards
interface LevelMilestoneReward {
  level: number;
  coins: number;
  gems: number;
  affection: number;
  unlocks: string[];
}

const LEVEL_MILESTONES: LevelMilestoneReward[] = [
  { level: 5, coins: 200, gems: 20, affection: 30, unlocks: ['Khả năng kể chuyện', 'Quà tulip'] },
  { level: 10, coins: 500, gems: 50, affection: 50, unlocks: ['Gợi ý hoạt động', 'Vòng tay bạc', 'Scene: Công viên'] },
  { level: 15, coins: 800, gems: 80, affection: 80, unlocks: ['Viết thơ ngẫu hứng', 'Dây chuyền vàng'] },
  { level: 20, coins: 1000, gems: 100, affection: 100, unlocks: ['Chia sẻ bí mật', 'Chuyến du lịch'] },
  { level: 25, coins: 1500, gems: 150, affection: 150, unlocks: ['Kỷ niệm đặc biệt', 'Nhẫn kim cương'] },
  { level: 30, coins: 2000, gems: 200, affection: 200, unlocks: ['Tình yêu vĩnh cửu'] },
];

// NEW: XP scaling formula - higher levels need more XP
function getXpRequiredForLevel(level: number): number {
  // Level 1→2: 100 XP
  // Level 5→6: 300 XP
  // Level 10→11: 550 XP
  // Level 20→21: 1050 XP
  // Formula: 100 + (level - 1) * 50
  return 100 + (level - 1) * 50;
}

// NEW: Calculate total XP needed to reach a level from level 1 (O(1) formula)
function getTotalXpForLevel(level: number): number {
  // Arithmetic series: sum(100 + (i-1)*50) for i=1 to level-1
  // = 100*(level-1) + 50*(level-1)*(level-2)/2
  const n = level - 1;
  if (n <= 0) return 0;
  return 100 * n + 25 * n * (n - 1);
}

function calculateRelationshipStage(affection: number): RelationshipStage {
  if (affection >= 900) return 'LOVER';
  if (affection >= 750) return 'DATING';
  if (affection >= 600) return 'CRUSH';
  if (affection >= 450) return 'CLOSE_FRIEND';
  if (affection >= 250) return 'FRIEND';
  if (affection >= 100) return 'ACQUAINTANCE';
  return 'STRANGER';
}

// NEW: Get unlocked features based on level
function getUnlockedFeatures(level: number): string[] {
  const features: string[] = [];
  for (const milestone of LEVEL_MILESTONES) {
    if (level >= milestone.level) {
      features.push(...milestone.unlocks);
    }
  }
  return features;
}

export const characterService = {
  async getActiveCharacter(userId: string) {
    // Try cache first
    const cacheKey = CacheKeys.character(userId);
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
      include: {
        template: true,
        characterFacts: {
          orderBy: { importance: 'desc' },
          take: 20,
        },
        scenes: {
          include: { scene: true },
        },
      },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    // Add unlocked features to response
    const unlockedFeatures = getUnlockedFeatures(character.level);
    const xpForNextLevel = getXpRequiredForLevel(character.level);
    const progressPercent = Math.round((character.experience / xpForNextLevel) * 100);

    const result = {
      ...character,
      unlockedFeatures,
      xpForNextLevel,
      progressPercent,
    };

    // Cache result
    await cache.set(cacheKey, result, CacheTTL.CHARACTER);

    return result;
  },

  async createCharacter(userId: string, data: CreateCharacterData) {
    // Deactivate other characters
    await prisma.character.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    log.debug('Creating character with data:', {
      userId,
      name: data.name,
      age: data.age,
      occupation: data.occupation,
      personality: data.personality,
    });

    const character = await prisma.character.create({
      data: {
        userId,
        name: data.name,
        nickname: data.nickname,
        gender: data.gender || 'FEMALE',
        personality: data.personality || 'caring',
        birthday: data.birthday ? new Date(data.birthday) : undefined,
        bio: data.bio || `Xin chao! Toi la ${data.name}`,
        age: data.age || 22,
        occupation: data.occupation || 'student',
        templateId: data.templateId || undefined,
        avatarUrl: data.avatarUrl || undefined,
        isActive: true,
      },
      include: {
        template: true,
      },
    });

    log.debug('Character created:', {
      id: character.id,
      name: character.name,
      age: character.age,
      occupation: character.occupation,
    });

    // Invalidate cache for this user's active character
    await cache.del(CacheKeys.character(userId));

    return character;
  },

  async updateCharacter(userId: string, data: UpdateCharacterData) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const updated = await prisma.character.update({
      where: { id: character.id },
      data,
    });

    // Invalidate caches
    await cache.del(CacheKeys.character(userId));
    await cache.del(CacheKeys.characterWithFacts(character.id));

    return updated;
  },

  async customizeCharacter(userId: string, data: CustomizeCharacterData) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const updated = await prisma.character.update({
      where: { id: character.id },
      data,
    });

    // Invalidate caches
    await cache.del(CacheKeys.character(userId));
    await cache.del(CacheKeys.characterWithFacts(character.id));

    return updated;
  },

  async getFacts(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    return prisma.characterFact.findMany({
      where: { characterId: character.id },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async addFact(userId: string, data: AddFactData) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    return prisma.characterFact.upsert({
      where: {
        characterId_key: {
          characterId: character.id,
          key: data.key,
        },
      },
      update: {
        value: data.value,
        category: data.category,
        importance: data.importance || 5,
      },
      create: {
        characterId: character.id,
        category: data.category,
        key: data.key,
        value: data.value,
        importance: data.importance || 5,
      },
    });
  },

  async getRelationshipStatus(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    const currentStage = character.relationshipStage;
    const nextStage = Object.entries(RELATIONSHIP_THRESHOLDS).find(
      ([_, threshold]) => threshold > character.affection
    );

    // NEW: Enhanced relationship status with level info
    const xpForNextLevel = getXpRequiredForLevel(character.level);
    const unlockedFeatures = getUnlockedFeatures(character.level);
    const nextMilestone = LEVEL_MILESTONES.find(m => m.level > character.level);

    return {
      currentStage,
      affection: character.affection,
      level: character.level,
      experience: character.experience,
      xpForNextLevel,
      progressToNextLevel: Math.round((character.experience / xpForNextLevel) * 100),
      nextStage: nextStage ? nextStage[0] : null,
      nextStageThreshold: nextStage ? nextStage[1] : null,
      progressToNextStage: nextStage
        ? Math.round(
          ((character.affection - RELATIONSHIP_THRESHOLDS[currentStage]) /
            (nextStage[1] - RELATIONSHIP_THRESHOLDS[currentStage])) *
          100
        )
        : 100,
      unlockedFeatures,
      nextMilestone: nextMilestone ? {
        level: nextMilestone.level,
        unlocks: nextMilestone.unlocks,
      } : null,
    };
  },

  async updateAffection(characterId: string, amount: number, userId?: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, userId: true, affection: true, relationshipStage: true },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    // Authorization check: if userId is provided, verify ownership
    if (userId && character.userId !== userId) {
      throw new AppError('Not authorized to update this character', 403, 'FORBIDDEN');
    }

    const newAffection = Math.max(
      VALIDATION.AFFECTION_MIN,
      Math.min(VALIDATION.AFFECTION_MAX, character.affection + amount)
    );
    const newStage = calculateRelationshipStage(newAffection);
    const stageChanged = newStage !== character.relationshipStage;

    const updated = await prisma.character.update({
      where: { id: characterId },
      data: {
        affection: newAffection,
        relationshipStage: newStage,
      },
    });

    // Invalidate character cache
    await cache.del(CacheKeys.character(character.userId), CacheKeys.characterById(characterId));

    return {
      ...updated,
      stageChanged,
      previousStage: character.relationshipStage,
    };
  },

  // Enhanced addExperience with XP scaling and level-up rewards
  async addExperience(characterId: string, xp: number): Promise<{
    character: any;
    leveledUp: boolean;
    previousLevel: number;
    newLevel: number;
    milestoneReward: LevelMilestoneReward | null;
  }> {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    const previousLevel = character.level;
    let newXp = character.experience + xp;
    let newLevel = character.level;
    let milestoneReward: LevelMilestoneReward | null = null;

    // Check for level ups with scaling XP
    let xpNeeded = getXpRequiredForLevel(newLevel);
    while (newXp >= xpNeeded) {
      newXp -= xpNeeded;
      newLevel++;
      xpNeeded = getXpRequiredForLevel(newLevel);

      // Check if this level is a milestone
      const milestone = LEVEL_MILESTONES.find(m => m.level === newLevel);
      if (milestone) {
        milestoneReward = milestone;
      }
    }

    // Update character
    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        experience: newXp,
        level: newLevel,
      },
    });

    // If leveled up and hit a milestone, give rewards
    if (milestoneReward && character.userId) {
      await prisma.user.update({
        where: { id: character.userId },
        data: {
          coins: { increment: milestoneReward.coins },
          gems: { increment: milestoneReward.gems },
        },
      });

      // Add milestone affection
      if (milestoneReward.affection > 0) {
        await prisma.character.update({
          where: { id: characterId },
          data: {
            affection: { increment: milestoneReward.affection },
          },
        });
      }

      // Create memory for milestone
      await prisma.memory.create({
        data: {
          userId: character.userId,
          characterId,
          type: 'MILESTONE',
          title: `Đạt Level ${milestoneReward.level}! 🎉`,
          description: `Bạn đã đạt level ${milestoneReward.level} với ${character.name}. Mở khóa: ${milestoneReward.unlocks.join(', ')}`,
          milestone: `LEVEL_${milestoneReward.level}`,
          metadata: {
            level: milestoneReward.level,
            coins: milestoneReward.coins,
            gems: milestoneReward.gems,
            affection: milestoneReward.affection,
            unlocks: milestoneReward.unlocks,
          },
        },
      });
    }

    // Invalidate character cache
    await cache.del(CacheKeys.character(character.userId), CacheKeys.characterById(characterId));

    return {
      character: updatedCharacter,
      leveledUp: newLevel > previousLevel,
      previousLevel,
      newLevel,
      milestoneReward,
    };
  },

  // NEW: Get XP info for display
  getXpInfo(level: number, experience: number) {
    const xpForNextLevel = getXpRequiredForLevel(level);
    const totalXpForCurrentLevel = getTotalXpForLevel(level);
    const totalXpForNextLevel = getTotalXpForLevel(level + 1);

    return {
      currentXp: experience,
      xpForNextLevel,
      totalXpForCurrentLevel,
      totalXpForNextLevel,
      progressPercent: Math.round((experience / xpForNextLevel) * 100),
    };
  },

  // NEW: Get level milestone info
  getLevelMilestones() {
    return LEVEL_MILESTONES;
  },

  // NEW: Check what features are unlocked at current level
  async getUnlockedFeaturesForUser(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      return { features: [], nextUnlock: LEVEL_MILESTONES[0] };
    }

    const features = getUnlockedFeatures(character.level);
    const nextMilestone = LEVEL_MILESTONES.find(m => m.level > character.level);

    return {
      features,
      currentLevel: character.level,
      nextUnlock: nextMilestone || null,
      levelsToNextUnlock: nextMilestone ? nextMilestone.level - character.level : 0,
    };
  },
};
