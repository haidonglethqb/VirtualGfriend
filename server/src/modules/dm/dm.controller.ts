import { Request, Response, NextFunction } from 'express'
import { dmService } from './dm.service'
import { AppError } from '../../middlewares/error.middleware'
import { z } from 'zod'

const getConversationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const getOrCreateConversationSchema = z.object({
  targetUserId: z.string().uuid('Invalid targetUserId format'),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string().uuid()).min(1, 'At least one member is required'),
});

const getMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  messageType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'STICKER', 'GIFT']).optional(),
});

const markReadSchema = z.object({});

const searchUsersSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
});

export const dmController = {
  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const parsed = getConversationsSchema.parse(req.query)
      const result = await dmService.getConversations(userId, parsed.page, parsed.limit)
      res.json({ success: true, data: result })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async getOrCreateConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const parsed = getOrCreateConversationSchema.parse(req.body)
      const conversation = await dmService.getOrCreateConversation(userId, parsed.targetUserId)
      res.json({ success: true, data: conversation })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const parsed = createGroupSchema.parse(req.body)
      const conversation = await dmService.createGroupConversation(userId, parsed.name, parsed.memberIds)
      res.json({ success: true, data: conversation })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { conversationId } = req.params
      const parsed = getMessagesSchema.parse(req.query)
      const result = await dmService.getMessages(userId, conversationId, parsed.limit, parsed.cursor)
      res.json({ success: true, data: result })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { conversationId } = req.params
      const parsed = sendMessageSchema.parse(req.body)
      const message = await dmService.sendMessage(userId, conversationId, parsed.content, parsed.messageType)
      res.json({ success: true, data: message })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const { conversationId } = req.params
      markReadSchema.parse({})
      await dmService.markRead(userId, conversationId)
      res.json({ success: true })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const parsed = searchUsersSchema.parse({ q: req.query.q })
      const users = await dmService.searchUsers(parsed.q, userId)
      res.json({ success: true, data: users })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(err.errors[0].message, 400, 'VALIDATION_ERROR'))
      }
      next(err)
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const count = await dmService.getTotalUnreadCount(userId)
      res.json({ success: true, data: { count } })
    } catch (err) { next(err) }
  },
}
