import { Request, Response, NextFunction } from 'express'
import { dmService } from './dm.service'
import { AppError } from '../../middlewares/error.middleware'

export const dmController = {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const result = await dmService.getConversations(userId, page, limit)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async getOrCreateConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { targetUserId } = req.body
      if (!targetUserId) throw new AppError('targetUserId is required', 400, 'MISSING_FIELD')
      const conversation = await dmService.getOrCreateConversation(userId, targetUserId)
      res.json({ success: true, data: conversation })
    } catch (err) { next(err) }
  },

  async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { name, memberIds } = req.body
      if (!name || !memberIds?.length) throw new AppError('name and memberIds are required', 400, 'MISSING_FIELD')
      const conversation = await dmService.createGroupConversation(userId, name, memberIds)
      res.json({ success: true, data: conversation })
    } catch (err) { next(err) }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { conversationId } = req.params
      const limit = parseInt(req.query.limit as string) || 50
      const cursor = req.query.cursor as string | undefined
      const result = await dmService.getMessages(userId, conversationId, limit, cursor)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { conversationId } = req.params
      const { content, messageType } = req.body
      if (!content) throw new AppError('content is required', 400, 'MISSING_FIELD')
      const message = await dmService.sendMessage(userId, conversationId, content, messageType)
      res.json({ success: true, data: message })
    } catch (err) { next(err) }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { conversationId } = req.params
      await dmService.markRead(userId, conversationId)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const query = req.query.q as string
      if (!query || query.length < 2) throw new AppError('Search query too short', 400, 'SHORT_QUERY')
      const users = await dmService.searchUsers(query, userId)
      res.json({ success: true, data: users })
    } catch (err) { next(err) }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const count = await dmService.getTotalUnreadCount(userId)
      res.json({ success: true, data: { count } })
    } catch (err) { next(err) }
  },
}
