import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { RelationshipStage, Gender } from '@prisma/client';

interface CreateCharacterData {
  name: string;
  nickname?: string;
  gender?: Gender;
  personality?: string;
  birthday?: string;
  bio?: string;
}

interface UpdateCharacterData {
  name?: string;
  nickname?: string;
  personality?: string;
  bio?: string;
  responseStyle?: string;
  creativityLevel?: number;
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

function calculateRelationshipStage(affection: number): RelationshipStage {
  if (affection >= 900) return 'LOVER';
  if (affection >= 750) return 'DATING';
  if (affection >= 600) return 'CRUSH';
  if (affection >= 450) return 'CLOSE_FRIEND';
  if (affection >= 250) return 'FRIEND';
  if (affection >= 100) return 'ACQUAINTANCE';
  return 'STRANGER';
}

export const characterService = {
  async getActiveCharacter(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
      include: {
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

    return character;
  },

  async createCharacter(userId: string, data: CreateCharacterData) {
    // Deactivate other characters
    await prisma.character.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    return prisma.character.create({
      data: {
        userId,
        name: data.name,
        nickname: data.nickname,
        gender: data.gender || 'FEMALE',
        personality: data.personality || 'caring',
        birthday: data.birthday ? new Date(data.birthday) : undefined,
        bio: data.bio || `Xin chào! Tôi là ${data.name} 💕`,
        isActive: true,
      },
    });
  },

  async updateCharacter(userId: string, data: UpdateCharacterData) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    return prisma.character.update({
      where: { id: character.id },
      data,
    });
  },

  async customizeCharacter(userId: string, data: CustomizeCharacterData) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true },
    });

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER');
    }

    return prisma.character.update({
      where: { id: character.id },
      data,
    });
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

    return {
      currentStage,
      affection: character.affection,
      level: character.level,
      experience: character.experience,
      nextStage: nextStage ? nextStage[0] : null,
      nextStageThreshold: nextStage ? nextStage[1] : null,
      progressToNextStage: nextStage
        ? Math.round(
            ((character.affection - RELATIONSHIP_THRESHOLDS[currentStage]) /
              (nextStage[1] - RELATIONSHIP_THRESHOLDS[currentStage])) *
              100
          )
        : 100,
    };
  },

  async updateAffection(characterId: string, amount: number) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    const newAffection = Math.max(0, Math.min(1000, character.affection + amount));
    const newStage = calculateRelationshipStage(newAffection);

    return prisma.character.update({
      where: { id: characterId },
      data: {
        affection: newAffection,
        relationshipStage: newStage,
      },
    });
  },

  async addExperience(characterId: string, xp: number) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new AppError('Character not found', 404, 'CHARACTER_NOT_FOUND');
    }

    const xpPerLevel = 100; // XP needed per level
    let newXp = character.experience + xp;
    let newLevel = character.level;

    while (newXp >= xpPerLevel) {
      newXp -= xpPerLevel;
      newLevel++;
    }

    return prisma.character.update({
      where: { id: characterId },
      data: {
        experience: newXp,
        level: newLevel,
      },
    });
  },
};
