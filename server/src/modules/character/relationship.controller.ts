import { Request, Response, NextFunction } from 'express'
import { relationshipService } from './relationship.service'
import { createModuleLogger } from '../../lib/logger'
import { z } from 'zod'
import { AppError } from '../../middlewares/error.middleware'

const log = createModuleLogger('RelationshipController')

const endRelationshipSchema = z.object({
  reason: z.string().max(200).optional(),
  exPersonaConsent: z.boolean().optional(),
})

const updateExPersonaSettingsSchema = z.object({
  exMessagingEnabled: z.boolean(),
})

export const relationshipController = {
  /**
   * GET /relationship/status
   * Get current relationship status and progress
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const status = await relationshipService.getRelationshipStatus(userId)
      res.json({ success: true, data: status })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /relationship/history
   * Get history of all relationships (past and current)
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const history = await relationshipService.getRelationshipHistory(userId)
      res.json({ success: true, data: history })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /relationship/end
   * End current relationship (breakup)
   */
  async endRelationship(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { reason, exPersonaConsent } = endRelationshipSchema.parse(req.body ?? {})
      
      const result = await relationshipService.endRelationship(userId, {
        reason,
        exPersonaConsent,
        premiumTier: req.premiumInfo?.tier || 'FREE',
      })
      
      res.json({ success: true, data: result })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(error)
    }
  },

  /**
   * POST /relationship/reconcile/:characterId
   * Try to get back together with an ex
   */
  async reconcile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { characterId } = req.params
      
      const result = await relationshipService.reconcileRelationship(userId, characterId)
      
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  },

  /**
   * PATCH /relationship/ex-personas/:characterId
   * Update user-managed settings for an ex persona
   */
  async updateExPersonaSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { characterId } = req.params
      const input = updateExPersonaSettingsSchema.parse(req.body ?? {})

      const result = await relationshipService.updateExPersonaSettings(userId, characterId, input)

      res.json({ success: true, data: result })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(error.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(error)
    }
  },

  /**
   * DELETE /relationship/ex-personas/:characterId
   * Permanently delete an ex persona and related chat data
   */
  async deleteExPersona(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { characterId } = req.params

      const result = await relationshipService.deleteExPersona(userId, characterId)

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /relationship/can-start-new
   * Check if user can start a new relationship
   */
  async canStartNew(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      
      // Get user's premium tier
      const { prisma } = await import('../../lib/prisma')
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { premiumTier: true },
      })
      
      const result = await relationshipService.canStartNewRelationship(
        userId, 
        user?.premiumTier || 'FREE'
      )
      
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  },
}
