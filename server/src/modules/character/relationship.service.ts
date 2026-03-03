import { prisma } from '../../lib/prisma'
import { cache, CacheKeys } from '../../lib/redis'
import { AppError } from '../../middlewares/error.middleware'
import { RelationshipStage, RelationshipEventType } from '@prisma/client'
import { createModuleLogger } from '../../lib/logger'
import { RELATIONSHIP_THRESHOLDS, SCENE_PROGRESSION } from '../../lib/constants'

const log = createModuleLogger('Relationship')

// Calculate relationship stage from affection
function calculateRelationshipStage(affection: number): RelationshipStage {
  if (affection >= 900) return 'LOVER'
  if (affection >= 750) return 'DATING'
  if (affection >= 600) return 'CRUSH'
  if (affection >= 450) return 'CLOSE_FRIEND'
  if (affection >= 250) return 'FRIEND'
  if (affection >= 100) return 'ACQUAINTANCE'
  return 'STRANGER'
}

// Get progress to next stage
function getProgressToNextStage(affection: number, currentStage: RelationshipStage) {
  const stages = Object.entries(RELATIONSHIP_THRESHOLDS)
  const currentIdx = stages.findIndex(([stage]) => stage === currentStage)
  
  if (currentIdx === stages.length - 1) {
    return { progress: 100, nextStage: null, nextThreshold: null }
  }
  
  const [nextStage, nextThreshold] = stages[currentIdx + 1]
  const currentThreshold = RELATIONSHIP_THRESHOLDS[currentStage]
  const progress = Math.round(((affection - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
  
  return { progress: Math.min(progress, 100), nextStage, nextThreshold }
}

export const relationshipService = {
  /**
   * Get relationship status and progress
   */
  async getRelationshipStatus(userId: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true, isEnded: false },
      include: {
        relationshipHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER')
    }

    const currentStage = character.relationshipStage
    const { progress, nextStage, nextThreshold } = getProgressToNextStage(character.affection, currentStage)
    
    // Get available scenes for current stage
    const currentStageIdx = Object.keys(RELATIONSHIP_THRESHOLDS).indexOf(currentStage)
    const availableSceneCategories = Object.entries(SCENE_PROGRESSION)
      .filter(([_, __], idx) => idx <= currentStageIdx)
      .flatMap(([_, categories]) => categories)

    return {
      characterId: character.id,
      characterName: character.name,
      currentStage,
      affection: character.affection,
      level: character.level,
      experience: character.experience,
      relationshipStartedAt: character.relationshipStartedAt,
      firstMetAt: character.firstMetAt,
      daysKnown: Math.floor((Date.now() - character.firstMetAt.getTime()) / (1000 * 60 * 60 * 24)),
      progressToNextStage: progress,
      nextStage,
      nextThreshold,
      recentHistory: character.relationshipHistory,
      availableSceneCategories,
    }
  },

  /**
   * Record a relationship event (stage change, milestone, etc.)
   */
  async recordEvent(
    userId: string, 
    characterId: string, 
    eventType: RelationshipEventType,
    data?: {
      fromStage?: RelationshipStage
      toStage?: RelationshipStage
      note?: string
      metadata?: any
    }
  ) {
    const event = await prisma.relationshipHistory.create({
      data: {
        userId,
        characterId,
        eventType,
        fromStage: data?.fromStage,
        toStage: data?.toStage,
        note: data?.note,
        metadata: data?.metadata,
      },
    })

    log.info('Relationship event recorded', { userId, characterId, eventType })
    return event
  },

  /**
   * Update affection and check for stage progression
   */
  async updateAffection(userId: string, amount: number, reason: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true, isEnded: false },
    })

    if (!character) {
      throw new AppError('No active character found', 404, 'NO_CHARACTER')
    }

    const oldStage = character.relationshipStage
    const newAffection = Math.min(1000, Math.max(0, character.affection + amount))
    const newStage = calculateRelationshipStage(newAffection)

    const updateData: any = { affection: newAffection, relationshipStage: newStage }
    
    // If transitioning to DATING, record relationship start
    if (oldStage !== 'DATING' && oldStage !== 'LOVER' && (newStage === 'DATING' || newStage === 'LOVER')) {
      updateData.relationshipStartedAt = new Date()
    }

    const updated = await prisma.character.update({
      where: { id: character.id },
      data: updateData,
    })

    // Record stage progression event
    if (oldStage !== newStage) {
      await this.recordEvent(userId, character.id, 'STAGE_UP', {
        fromStage: oldStage,
        toStage: newStage,
        note: reason,
      })

      // Special events for certain stages
      if (newStage === 'DATING') {
        await this.recordEvent(userId, character.id, 'STARTED_DATING', {
          fromStage: oldStage,
          toStage: newStage,
          note: 'Chính thức bắt đầu hẹn hò!',
        })
      }
    }

    // Invalidate cache
    await cache.del(CacheKeys.character(userId))

    return {
      character: updated,
      stageChanged: oldStage !== newStage,
      oldStage,
      newStage,
      affectionChange: amount,
    }
  },

  /**
   * End relationship with current character (breakup)
   */
  async endRelationship(userId: string, reason?: string) {
    const character = await prisma.character.findFirst({
      where: { userId, isActive: true, isEnded: false },
    })

    if (!character) {
      throw new AppError('No active relationship found', 404, 'NO_CHARACTER')
    }

    // Record breakup event
    await this.recordEvent(userId, character.id, 'BREAKUP', {
      fromStage: character.relationshipStage,
      note: reason || 'Kết thúc mối quan hệ',
      metadata: { affectionAtBreakup: character.affection, levelAtBreakup: character.level },
    })

    // Mark character as ended
    const updated = await prisma.character.update({
      where: { id: character.id },
      data: {
        isActive: false,
        isEnded: true,
        endedAt: new Date(),
        endReason: reason || 'user_choice',
      },
    })

    // Invalidate caches
    await cache.del(CacheKeys.character(userId))

    log.info('Relationship ended', { userId, characterId: character.id, reason })

    return {
      message: 'Mối quan hệ đã kết thúc',
      character: updated,
    }
  },

  /**
   * Get history of all relationships (current and past)
   */
  async getRelationshipHistory(userId: string) {
    const characters = await prisma.character.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        _count: {
          select: { messages: true, receivedGifts: true, memories: true },
        },
      },
    })

    return characters.map(char => ({
      id: char.id,
      name: char.name,
      avatarUrl: char.avatarUrl || char.template?.avatarUrl,
      gender: char.gender,
      personality: char.personality,
      relationshipStage: char.relationshipStage,
      affection: char.affection,
      level: char.level,
      isActive: char.isActive,
      isEnded: char.isEnded,
      firstMetAt: char.firstMetAt,
      relationshipStartedAt: char.relationshipStartedAt,
      endedAt: char.endedAt,
      endReason: char.endReason,
      stats: char._count,
    }))
  },

  /**
   * Check if user can start a new relationship
   */
  async canStartNewRelationship(userId: string, premiumTier: string) {
    const characters = await prisma.character.findMany({
      where: { userId, isEnded: false },
    })

    const maxCharacters = {
      FREE: 1,
      BASIC: 2,
      PRO: 5,
      ULTIMATE: -1, // Unlimited
    }[premiumTier] ?? 1

    if (maxCharacters === -1) {
      return { canStart: true, currentCount: characters.length, maxAllowed: -1 }
    }

    return {
      canStart: characters.length < maxCharacters,
      currentCount: characters.length,
      maxAllowed: maxCharacters,
    }
  },

  /**
   * Try to reconcile with an ended relationship
   */
  async reconcileRelationship(userId: string, characterId: string) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId, isEnded: true },
    })

    if (!character) {
      throw new AppError('Character not found or not ended', 404, 'CHARACTER_NOT_FOUND')
    }

    // Check if user has premium or enough gems for reconciliation
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    const reconcileCost = 100 // Gems required to reconcile
    if (user.premiumTier === 'FREE' && user.gems < reconcileCost) {
      throw new AppError(
        `Cần ${reconcileCost} gems để quay lại với ${character.name}`,
        400,
        'INSUFFICIENT_GEMS'
      )
    }

    // Deactivate any current active relationships
    await prisma.character.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    // Reactivate the character with reduced affection
    const newAffection = Math.floor(character.affection * 0.5) // 50% affection penalty
    const newStage = calculateRelationshipStage(newAffection)

    const updated = await prisma.character.update({
      where: { id: character.id },
      data: {
        isActive: true,
        isEnded: false,
        endedAt: null,
        endReason: null,
        affection: newAffection,
        relationshipStage: newStage,
      },
    })

    // Deduct gems for non-premium users
    if (user.premiumTier === 'FREE') {
      await prisma.user.update({
        where: { id: userId },
        data: { gems: { decrement: reconcileCost } },
      })
    }

    // Record reconciliation event
    await this.recordEvent(userId, character.id, 'RECONCILIATION', {
      toStage: newStage,
      note: 'Quay lại với nhau',
      metadata: { previousAffection: character.affection, newAffection },
    })

    // Invalidate cache
    await cache.del(CacheKeys.character(userId))

    return {
      message: `Đã quay lại với ${character.name}`,
      character: updated,
      affectionPenalty: character.affection - newAffection,
    }
  },
}
