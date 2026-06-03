import { prisma } from '../../lib/prisma'
import { cache, CacheKeys } from '../../lib/redis'
import { AppError } from '../../middlewares/error.middleware'
import { RelationshipStage, RelationshipEventType } from '@prisma/client'
import { createModuleLogger } from '../../lib/logger'
import { RELATIONSHIP_THRESHOLDS, SCENE_PROGRESSION } from '../../lib/constants'
import { exPersonaService } from './ex-persona.service'
import { getTierConfig, type PremiumTier } from '../admin/tier-config.service'
import { getExAccess } from './ex-access.service'
import { exComebackService } from './ex-comeback.service'

const log = createModuleLogger('Relationship')
const RECONCILE_AFFECTION_THRESHOLD = 700

const BREAKUP_REASON_LABELS: Record<string, string> = {
  distance_needed: 'Cần khoảng cách',
  not_feeling_same: 'Không còn cảm xúc như trước',
  too_busy: 'Quá bận để tiếp tục',
  hurt_or_disappointed: 'Bị tổn thương hoặc thất vọng',
  trust_issue: 'Vấn đề niềm tin',
  other: 'Lý do khác',
}

function formatBreakupReason(reasonPreset?: string, reasonNote?: string) {
  const preset = reasonPreset && BREAKUP_REASON_LABELS[reasonPreset] ? reasonPreset : 'other'
  const label = BREAKUP_REASON_LABELS[preset]
  const note = reasonNote?.trim()
  return {
    preset,
    label,
    note: note || null,
    summary: note ? `${label}: ${note}` : label,
  }
}

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
      where: { userId, isActive: true, isEnded: false, isExPersona: false },
      orderBy: { createdAt: 'desc' },
      include: {
        relationshipHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!character) {
      const latestEnded = await prisma.character.findFirst({
        where: {
          userId,
          isEnded: true,
          isExPersona: false,
          endReason: { not: 'source_relationship_reconciled' },
        },
        orderBy: { endedAt: 'desc' },
        include: {
          template: { select: { avatarUrl: true } },
          relationshipHistory: {
            where: { eventType: 'BREAKUP' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
      const access = await getExAccess(userId)

      return {
        relationshipState: 'NO_ACTIVE_RELATIONSHIP',
        characterId: null,
        characterName: null,
        latestEndedRelationship: latestEnded ? {
          id: latestEnded.id,
          name: latestEnded.name,
          avatarUrl: latestEnded.avatarUrl || latestEnded.template?.avatarUrl || null,
          affection: latestEnded.affection,
          level: latestEnded.level,
          relationshipStage: latestEnded.relationshipStage,
          endedAt: latestEnded.endedAt,
          endReason: latestEnded.endReason,
          breakup: latestEnded.relationshipHistory[0] || null,
          canChatEx: access.canChatEx,
          canGiftEx: access.canGiftEx,
          requiredTier: access.requiredTier,
          lockReason: access.lockReason,
          reconcileAvailable: latestEnded.affection >= RECONCILE_AFFECTION_THRESHOLD && access.canChatEx,
          reconcileThreshold: RECONCILE_AFFECTION_THRESHOLD,
        } : null,
        message: 'No active relationship',
      }
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
      relationshipState: 'ACTIVE',
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
      where: { userId, isActive: true, isEnded: false, isExPersona: false },
      orderBy: { createdAt: 'desc' },
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
  async endRelationship(
    userId: string,
    options?: {
      characterId?: string
      reason?: string
      reasonPreset?: string
      reasonNote?: string
      exPersonaConsent?: boolean
      premiumTier?: PremiumTier
    }
  ) {
    const targetCharacterId = options?.characterId
    const character = await prisma.character.findFirst({
      where: targetCharacterId
        ? { id: targetCharacterId, userId, isActive: true, isEnded: false, isExPersona: false }
        : { userId, isActive: true, isEnded: false, isExPersona: false },
      ...(targetCharacterId ? {} : { orderBy: { createdAt: 'desc' as const } }),
    })

    if (!character) {
      throw new AppError('No active relationship found', 404, 'NO_CHARACTER')
    }

    const breakupReason = formatBreakupReason(options?.reasonPreset || options?.reason, options?.reasonNote)
    const endedAt = new Date()
    const endedAtIso = endedAt.toISOString()
    const previousAffection = character.affection
    const endedAffection = Math.floor(previousAffection * 0.5)
    const endedStage = calculateRelationshipStage(endedAffection)

    const endedCharacter = await prisma.$transaction(async (tx) => {
      await tx.relationshipHistory.create({
        data: {
          userId,
          characterId: character.id,
          eventType: 'BREAKUP',
          fromStage: character.relationshipStage,
          toStage: endedStage,
          note: breakupReason.summary,
          metadata: {
            reasonPreset: breakupReason.preset,
            reasonLabel: breakupReason.label,
            reasonNote: breakupReason.note,
            affectionAtBreakup: previousAffection,
            affectionAfterBreakup: endedAffection,
            levelAtBreakup: character.level,
            endedAt: endedAtIso,
          },
        },
      })

      await tx.characterFact.upsert({
        where: {
          characterId_key: {
            characterId: character.id,
            key: 'breakup_reason',
          },
        },
        update: {
          value: breakupReason.summary,
          category: 'relationship',
          importance: 9,
          factType: 'permanent',
          sourceType: 'system_breakup',
          metadata: {
            reasonPreset: breakupReason.preset,
            reasonLabel: breakupReason.label,
            reasonNote: breakupReason.note,
            endedAt: endedAtIso,
          },
        },
        create: {
          characterId: character.id,
          key: 'breakup_reason',
          value: breakupReason.summary,
          category: 'relationship',
          importance: 9,
          factType: 'permanent',
          sourceType: 'system_breakup',
          metadata: {
            reasonPreset: breakupReason.preset,
            reasonLabel: breakupReason.label,
            reasonNote: breakupReason.note,
            endedAt: endedAtIso,
          },
        },
      })

      await tx.memory.create({
        data: {
          userId,
          characterId: character.id,
          type: 'EVENT',
          title: 'Đã chia tay',
          description: breakupReason.summary,
          milestone: 'breakup',
          isAutoGenerated: true,
          autoGenSource: 'breakup',
          metadata: {
            reasonPreset: breakupReason.preset,
            reasonLabel: breakupReason.label,
            reasonNote: breakupReason.note,
            previousAffection,
            endedAffection,
          },
        },
      })

      return tx.character.update({
        where: { id: character.id },
        data: {
          isActive: false,
          isEnded: true,
          endedAt,
          endReason: breakupReason.summary,
          affection: endedAffection,
          relationshipStage: endedStage,
          mood: 'sad',
        },
      })
    })

    await exComebackService.scheduleInitial(userId, character.id, endedAt)

    await cache.del(
      CacheKeys.character(userId),
      CacheKeys.characterById(character.id),
      CacheKeys.characterWithFacts(character.id)
    )

    log.info('Relationship ended', {
      userId,
      characterId: character.id,
      reason: breakupReason.summary,
      exPersonaCreated: false,
    })

    return {
      message: 'Relationship ended',
      character: endedCharacter,
      relationshipState: 'ENDED',
      breakupReason,
      chatHref: `/chat?characterId=${encodeURIComponent(endedCharacter.id)}`,
      exPersonaCreated: false,
      exPersonaId: null,
    }

  },

  /**
   * Get history of all relationships (current and past)
   */
  async getRelationshipHistory(userId: string) {
    const characters = await prisma.character.findMany({
      where: {
        userId,
        NOT: {
          isExPersona: true,
          endReason: 'source_relationship_reconciled',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        _count: {
          select: { messages: true, receivedGifts: true, memories: true },
        },
      },
    })

    const access = await getExAccess(userId)

    return characters.map(char => {
      const mappedCharacter = char as typeof char & {
        isExPersona: boolean
        exPersonaSourceId: string | null
        exMessagingEnabled: boolean
      }

      return ({
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
      isExPersona: mappedCharacter.isExPersona,
      exPersonaSourceId: mappedCharacter.exPersonaSourceId,
      exMessagingEnabled: mappedCharacter.exMessagingEnabled,
      relationshipState: char.isEnded ? 'ENDED' : 'ACTIVE',
      canChatEx: char.isEnded && !mappedCharacter.isExPersona ? access.canChatEx : false,
      canGiftEx: char.isEnded && !mappedCharacter.isExPersona ? access.canGiftEx : false,
      requiredTier: char.isEnded ? access.requiredTier : null,
      lockReason: char.isEnded ? access.lockReason : null,
      reconcileAvailable: char.isEnded && char.affection >= RECONCILE_AFFECTION_THRESHOLD && access.canChatEx,
      reconcileThreshold: RECONCILE_AFFECTION_THRESHOLD,
    })
    })
  },

  /**
   * Check if user can start a new relationship
   */
  async canStartNewRelationship(userId: string, premiumTier: PremiumTier) {
    const characters = await prisma.character.findMany({
      where: { userId, isEnded: false, isExPersona: false },
    })

    const tierConfig = await getTierConfig(premiumTier)
    const maxCharacters = tierConfig.maxCharacters

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
      where: { id: characterId, userId, isEnded: true, isExPersona: false },
    })

    if (!character) {
      throw new AppError('Character not found or not ended', 404, 'CHARACTER_NOT_FOUND')
    }

    const access = await getExAccess(userId)
    if (!access.isVip) {
      throw new AppError(`Nâng cấp VIP để quay lại với ${character.name}`, 403, 'RECONCILE_VIP_REQUIRED')
    }

    if (character.affection < RECONCILE_AFFECTION_THRESHOLD) {
      throw new AppError(
        `Cần đạt ${RECONCILE_AFFECTION_THRESHOLD} độ thân mật để quay lại với ${character.name}`,
        400,
        'RECONCILE_AFFECTION_TOO_LOW'
      )
    }

    const tierConfig = await getTierConfig(access.tier)
    const maxCharacters = tierConfig.maxCharacters
    if (maxCharacters !== -1) {
      const currentActiveCount = await prisma.character.count({
        where: { userId, isEnded: false, isExPersona: false },
      })

      if (currentActiveCount >= maxCharacters) {
        throw new AppError(
          `Bạn đã đạt giới hạn số nhân vật (${maxCharacters}). Hãy kết thúc một mối quan hệ hoặc nâng cấp VIP để quay lại với ${character.name}.`,
          403,
          'CHARACTER_LIMIT_REACHED'
        )
      }
    }

    const newAffection = character.affection
    const newStage = calculateRelationshipStage(newAffection)

    await prisma.$transaction(async (tx) => {
      await exPersonaService.archiveForSource(tx, userId, character.id, 'source_relationship_reconciled')

      await tx.character.update({
        where: { id: character.id },
        data: {
          isActive: true,
          isEnded: false,
          endedAt: null,
          endReason: null,
          affection: newAffection,
          relationshipStage: newStage,
          mood: 'happy',
        },
      })

      await tx.relationshipHistory.create({
        data: {
          userId,
          characterId: character.id,
          eventType: 'RECONCILIATION',
          toStage: newStage,
          note: 'Quay lại với nhau',
          metadata: { previousAffection: character.affection, newAffection, costGems: 0 },
        },
      })
    })

    await cache.del(
      CacheKeys.character(userId),
      CacheKeys.characterById(character.id),
      CacheKeys.characterWithFacts(character.id)
    )
    await exComebackService.cancelPendingForCharacter(userId, character.id, 'reconciled')

    return {
      message: `Đã quay lại với ${character.name}`,
      affectionPenalty: 0,
      newAffection,
      relationshipState: 'ACTIVE',
    }
  },

  /**
   * Update ex persona settings controlled by the user.
   */
  async updateExPersonaSettings(
    userId: string,
    characterId: string,
    input: { exMessagingEnabled: boolean }
  ) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId, isExPersona: true },
      select: { id: true, name: true, exMessagingEnabled: true },
    })

    if (!character) {
      throw new AppError('Ex persona not found', 404, 'CHARACTER_NOT_FOUND')
    }

    if (input.exMessagingEnabled) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          isPremium: true,
          premiumTier: true,
          premiumExpiresAt: true,
        },
      })

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND')
      }

      const tier = user.premiumTier as PremiumTier | null
      const tierConfig = tier ? await getTierConfig(tier) : null
      const premiumActive =
        !!tier &&
        user.isPremium &&
        (!user.premiumExpiresAt || user.premiumExpiresAt > new Date())

      if (!premiumActive || !tierConfig?.canCreateExPersonaOnBreakup) {
        throw new AppError(
          'Nâng cấp VIP để bật nhắn tin với người yêu cũ',
          403,
          'EX_PERSONA_PREMIUM_REQUIRED'
        )
      }
    }

    const updatedCharacter = await prisma.character.update({
      where: { id: character.id },
      data: { exMessagingEnabled: input.exMessagingEnabled },
      select: {
        id: true,
        name: true,
        exMessagingEnabled: true,
      },
    })

    await cache.del(
      CacheKeys.character(userId),
      CacheKeys.characterById(character.id),
      CacheKeys.characterWithFacts(character.id)
    )

    return {
      message: input.exMessagingEnabled
        ? `Đã bật tin nhắn comeback cho ${updatedCharacter.name}`
        : `Đã tắt tin nhắn comeback cho ${updatedCharacter.name}`,
      character: updatedCharacter,
    }
  },

  /**
   * Permanently delete an ex persona and its character-bound history.
   */
  async deleteExPersona(userId: string, characterId: string) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId, isExPersona: true },
      select: { id: true, name: true },
    })

    if (!character) {
      throw new AppError('Ex persona not found', 404, 'CHARACTER_NOT_FOUND')
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { characterId: character.id } }),
      prisma.memory.deleteMany({ where: { characterId: character.id } }),
      prisma.characterFact.deleteMany({ where: { characterId: character.id } }),
      prisma.characterScene.deleteMany({ where: { characterId: character.id } }),
      prisma.giftHistory.deleteMany({ where: { characterId: character.id } }),
      prisma.conversationSummary.deleteMany({ where: { characterId: character.id } }),
      prisma.relationshipHistory.deleteMany({ where: { characterId: character.id } }),
      prisma.character.delete({ where: { id: character.id } }),
    ])

    await cache.del(
      CacheKeys.character(userId),
      CacheKeys.characterById(character.id),
      CacheKeys.characterWithFacts(character.id)
    )

    return {
      message: `Đã xoá ${character.name}`,
      deletedCharacterId: character.id,
    }
  },
}
