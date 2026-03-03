import { Request, Response, NextFunction } from 'express'
import { relationshipService } from './relationship.service'
import { createModuleLogger } from '../../lib/logger'

const log = createModuleLogger('RelationshipController')

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
      const { reason } = req.body
      
      const result = await relationshipService.endRelationship(userId, reason)
      
      res.json({ success: true, data: result })
    } catch (error) {
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
