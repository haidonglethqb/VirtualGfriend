import { Router } from 'express'
import { dmController } from './dm.controller'
import { authenticate } from '../../middlewares/auth.middleware'

export const dmRouter = Router()

dmRouter.use(authenticate)

// Conversations
dmRouter.get('/conversations', dmController.getConversations)
dmRouter.post('/conversations', dmController.getOrCreateConversation)
dmRouter.post('/conversations/group', dmController.createGroup)

// Messages
dmRouter.get('/conversations/:conversationId/messages', dmController.getMessages)
dmRouter.post('/conversations/:conversationId/messages', dmController.sendMessage)
dmRouter.post('/conversations/:conversationId/read', dmController.markRead)

// User search
dmRouter.get('/users/search', dmController.searchUsers)

// Unread count
dmRouter.get('/unread-count', dmController.getUnreadCount)
