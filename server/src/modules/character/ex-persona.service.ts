import { Prisma, prisma, RelationshipStage, RelationshipEventType } from '../../lib/prisma'
import { createModuleLogger } from '../../lib/logger'
import { getTierConfig, type PremiumTier } from '../admin/tier-config.service'

const log = createModuleLogger('ExPersona')

const EX_PERSONA_MIN_STAGE: RelationshipStage = 'CRUSH'
const STAGE_ORDER: RelationshipStage[] = [
  'STRANGER',
  'ACQUAINTANCE',
  'FRIEND',
  'CLOSE_FRIEND',
  'CRUSH',
  'DATING',
  'IN_LOVE',
  'LOVER',
]

function hasRequiredStage(stage: RelationshipStage) {
  return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(EX_PERSONA_MIN_STAGE)
}

function buildExPersonaName(name: string) {
  return `${name} (Ex)`
}

export const exPersonaService = {
  async maybeCreateFromBreakup(input: {
    userId: string
    sourceCharacterId: string
    premiumTier: PremiumTier
    consentGiven?: boolean
  }) {
    if (!input.consentGiven) {
      return null
    }

    const generatedAt = new Date()

    const [sourceCharacter, userSettings, tierConfig] = await Promise.all([
      prisma.character.findFirst({
        where: { id: input.sourceCharacterId, userId: input.userId },
        include: {
          characterFacts: {
            orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
            take: 20,
          },
          conversationSummaries: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId: input.userId },
        select: { allowExPersonaMessages: true },
      }),
      getTierConfig(input.premiumTier),
    ])

    if (!tierConfig.canCreateExPersonaOnBreakup || userSettings?.allowExPersonaMessages === false) {
      return null
    }

    if (!sourceCharacter || sourceCharacter.isExPersona) {
      return null
    }

    if (!hasRequiredStage(sourceCharacter.relationshipStage)) {
      return null
    }

    const existing = await prisma.character.findFirst({
      where: {
        userId: input.userId,
        isExPersona: true,
        exPersonaSourceId: sourceCharacter.id,
      },
    })

    if (existing) {
      return prisma.$transaction(async (tx) => {
        const refreshed = await tx.character.update({
          where: { id: existing.id },
          data: {
            name: buildExPersonaName(sourceCharacter.name),
            nickname: sourceCharacter.nickname,
            personality: sourceCharacter.personality,
            mood: 'sad',
            level: sourceCharacter.level,
            experience: sourceCharacter.experience,
            affection: Math.max(200, Math.floor(sourceCharacter.affection * 0.7)),
            relationshipStage: sourceCharacter.relationshipStage,
            relationshipStartedAt: sourceCharacter.relationshipStartedAt,
            bio: sourceCharacter.bio,
            age: sourceCharacter.age,
            occupation: sourceCharacter.occupation,
            voiceType: sourceCharacter.voiceType,
            avatarUrl: sourceCharacter.avatarUrl,
            templateId: sourceCharacter.templateId,
            avatarStyle: sourceCharacter.avatarStyle,
            hairStyle: sourceCharacter.hairStyle,
            hairColor: sourceCharacter.hairColor,
            eyeColor: sourceCharacter.eyeColor,
            skinTone: sourceCharacter.skinTone,
            outfit: sourceCharacter.outfit,
            accessories: sourceCharacter.accessories,
            memoryEnabled: sourceCharacter.memoryEnabled,
            responseStyle: sourceCharacter.responseStyle,
            creativityLevel: sourceCharacter.creativityLevel,
            endedAt: sourceCharacter.endedAt ?? generatedAt,
            endReason: 'ex_persona_auto_generated',
            exMessagingEnabled: true,
            exPersonaGeneratedAt: generatedAt,
          },
        })

        await tx.characterFact.deleteMany({
          where: {
            characterId: existing.id,
            sourceType: 'ex_persona_snapshot',
          },
        })

        if (sourceCharacter.characterFacts.length > 0) {
          await tx.characterFact.createMany({
            data: sourceCharacter.characterFacts.map((fact) => ({
              characterId: existing.id,
              category: fact.category,
              key: fact.key,
              value: fact.value,
              importance: fact.importance,
              factType: fact.factType,
              sourceType: 'ex_persona_snapshot',
              learnedAt: fact.learnedAt,
            })),
          })
        }

        await tx.conversationSummary.deleteMany({
          where: { characterId: existing.id },
        })

        if (sourceCharacter.conversationSummaries.length > 0) {
          await tx.conversationSummary.createMany({
            data: sourceCharacter.conversationSummaries.map((summary) => ({
              userId: sourceCharacter.userId,
              characterId: existing.id,
              summary: summary.summary,
              keyTopics: summary.keyTopics,
              emotionalTone: summary.emotionalTone,
              messageCount: summary.messageCount,
              createdAt: summary.createdAt,
            })),
          })
        }

        return refreshed
      })
    }

    try {
      const exPersona = await prisma.$transaction(async (tx) => {
      const created = await tx.character.create({
        data: {
          userId: sourceCharacter.userId,
          name: buildExPersonaName(sourceCharacter.name),
          nickname: sourceCharacter.nickname,
          gender: sourceCharacter.gender,
          personality: sourceCharacter.personality,
          mood: 'sad',
          level: sourceCharacter.level,
          experience: sourceCharacter.experience,
          affection: Math.max(200, Math.floor(sourceCharacter.affection * 0.7)),
          relationshipStage: sourceCharacter.relationshipStage,
          relationshipStartedAt: sourceCharacter.relationshipStartedAt,
          firstMetAt: sourceCharacter.firstMetAt,
          birthday: sourceCharacter.birthday,
          bio: sourceCharacter.bio,
          age: sourceCharacter.age,
          occupation: sourceCharacter.occupation,
          voiceType: sourceCharacter.voiceType,
          avatarUrl: sourceCharacter.avatarUrl,
          templateId: sourceCharacter.templateId,
          avatarStyle: sourceCharacter.avatarStyle,
          hairStyle: sourceCharacter.hairStyle,
          hairColor: sourceCharacter.hairColor,
          eyeColor: sourceCharacter.eyeColor,
          skinTone: sourceCharacter.skinTone,
          outfit: sourceCharacter.outfit,
          accessories: sourceCharacter.accessories,
          memoryEnabled: sourceCharacter.memoryEnabled,
          responseStyle: sourceCharacter.responseStyle,
          creativityLevel: sourceCharacter.creativityLevel,
          isActive: false,
          isEnded: true,
          endedAt: sourceCharacter.endedAt ?? generatedAt,
          endReason: 'ex_persona_auto_generated',
          isExPersona: true,
          exPersonaSourceId: sourceCharacter.id,
          exPersonaGeneratedAt: generatedAt,
          exMessagingEnabled: true,
        },
      })

      if (sourceCharacter.characterFacts.length > 0) {
        await tx.characterFact.createMany({
          data: sourceCharacter.characterFacts.map((fact) => ({
            characterId: created.id,
            category: fact.category,
            key: fact.key,
            value: fact.value,
            importance: fact.importance,
            factType: fact.factType,
            sourceType: 'ex_persona_snapshot',
            learnedAt: fact.learnedAt,
          })),
        })
      }

      if (sourceCharacter.conversationSummaries.length > 0) {
        await tx.conversationSummary.createMany({
          data: sourceCharacter.conversationSummaries.map((summary) => ({
            userId: sourceCharacter.userId,
            characterId: created.id,
            summary: summary.summary,
            keyTopics: summary.keyTopics,
            emotionalTone: summary.emotionalTone,
            messageCount: summary.messageCount,
            createdAt: summary.createdAt,
          })),
        })
      }

      await tx.relationshipHistory.create({
        data: {
          userId: input.userId,
          characterId: created.id,
          eventType: RelationshipEventType.EX_PERSONA_CREATED,
          note: 'Auto-created ex persona after breakup',
          metadata: {
            sourceCharacterId: sourceCharacter.id,
            sourceStage: sourceCharacter.relationshipStage,
          } as Prisma.InputJsonValue,
        },
      })

        return created
      })

      log.info('Ex persona created', {
        userId: input.userId,
        sourceCharacterId: sourceCharacter.id,
        exPersonaId: exPersona.id,
      })

      return exPersona
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return prisma.character.findFirst({
          where: {
            userId: input.userId,
            isExPersona: true,
            exPersonaSourceId: sourceCharacter.id,
          },
        })
      }

      throw error
    }
  },

  async archiveForSource(tx: Prisma.TransactionClient, userId: string, sourceCharacterId: string, reason: string) {
    await tx.character.updateMany({
      where: {
        userId,
        isExPersona: true,
        exPersonaSourceId: sourceCharacterId,
      },
      data: {
        exMessagingEnabled: false,
        endReason: reason,
      },
    })
  },
}