import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { cache, CacheKeys, CacheTTL } from '../lib/redis'
import { chatService } from '../modules/chat/chat.service'
import { proactiveNotificationService } from '../modules/ai/proactive-notification.service'
import { moodService } from '../modules/character/mood.service'
import { createModuleLogger } from '../lib/logger'

const log = createModuleLogger('Socket')

interface AuthenticatedSocket extends Socket {
  userId?: string
}

interface JwtPayload {
  userId: string
  email: string
}

export function setupSocketHandlers(io: Server) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
      
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as JwtPayload

      // Use cache-aside pattern (same as auth middleware) instead of raw DB query
      const cacheKey = CacheKeys.userAuth(decoded.userId)
      let user = await cache.get<{ id: string }>(cacheKey)
      if (!user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true },
        })
        if (dbUser) {
          await cache.set(cacheKey, dbUser, CacheTTL.USER_AUTH)
          user = dbUser
        }
      }

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = user.id
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!
    const userRoom = `user:${userId}`
    
    // Join user's room for cross-tab sync
    socket.join(userRoom)

    // Check for proactive notifications (debounced per user — once per 5 minutes)
    ;(async () => {
      try {
        const notifDebounceKey = `proactive_notif:${userId}`
        const recentlyChecked = await cache.get<boolean>(notifDebounceKey)
        if (recentlyChecked) return

        const characters = await prisma.character.findMany({
          where: { userId },
          select: { id: true, name: true },
        })

        for (const character of characters) {
          const result = await proactiveNotificationService.checkAndSendNotification(character.id)
          if (result.shouldSend && result.notification) {
            // Broadcast to all user's tabs
            io.to(userRoom).emit('notification:proactive', {
              characterId: character.id,
              characterName: character.name,
              type: result.notification.type,
              message: result.notification.message,
              sourceSocketId: socket.id,
            })
          }
        }

        // Set debounce flag for 5 minutes
        await cache.set(notifDebounceKey, true, 300)
      } catch (err) {
        log.error('Proactive notification error:', err)
      }
    })()

    // Handle mood check request
    socket.on('character:mood_check', async (data: { characterId: string }) => {
      try {
        const mood = await moodService.getCurrentMood(data.characterId)
        // Broadcast mood update to all user's tabs
        io.to(userRoom).emit('character:mood_update', {
          characterId: data.characterId,
          ...mood,
          sourceSocketId: socket.id,
        })
      } catch (err) {
        log.error('Mood check error:', err)
      }
    })

    // Handle sending messages
    socket.on('message:send', async (data: {
      characterId: string
      content: string
      messageType?: string
    }) => {
      try {
        // Input validation
        if (!data.content || typeof data.content !== 'string') {
          socket.emit('error', { message: 'Message content is required' })
          return
        }
        
        // Sanitize and validate content length
        const content = data.content.trim()
        if (content.length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' })
          return
        }
        if (content.length > 2000) {
          socket.emit('error', { message: 'Message too long (max 2000 characters)' })
          return
        }

        // Broadcast typing indicator to ALL user's tabs
        io.to(userRoom).emit('character:typing', { 
          characterId: data.characterId,
          sourceSocketId: socket.id,
        })

        // Process message with validated content
        const result = await chatService.sendMessage(userId, {
          characterId: data.characterId,
          content: content,
          messageType: (data.messageType as 'TEXT') || 'TEXT',
        })

        // Broadcast user message to ALL user's tabs
        io.to(userRoom).emit('message:receive', {
          ...result.userMessage,
          isOwn: true,
          sourceSocketId: socket.id,
        })

        // Small delay to simulate typing
        setTimeout(() => {
          // Broadcast AI response to ALL user's tabs
          io.to(userRoom).emit('message:receive', {
            ...result.aiMessage,
            isOwn: false,
            emotion: result.emotion,
            sourceSocketId: socket.id,
          })

          // Broadcast mood change to all tabs
          if (result.moodChange) {
            io.to(userRoom).emit('character:mood_change', {
              characterId: data.characterId,
              mood: result.moodChange,
              sourceSocketId: socket.id,
            })
          }

          // Broadcast affection update to all tabs
          if (result.affectionChange !== undefined) {
            io.to(userRoom).emit('character:affection_change', {
              characterId: data.characterId,
              change: result.affectionChange,
              newAffection: result.newAffection,
              newLevel: result.newLevel,
              levelUp: result.levelUp,
              relationshipUpgrade: result.relationshipUpgrade,
              previousStage: result.previousStage,
              newStage: result.newStage,
              unlocks: result.unlocks,
              rewards: result.rewards,
              sourceSocketId: socket.id,
            })
          }

          // Broadcast quest completion to all tabs
          if (result.questsCompleted && result.questsCompleted.length > 0) {
            result.questsCompleted.forEach(quest => {
              io.to(userRoom).emit('quest:completed', {
                ...quest,
                sourceSocketId: socket.id,
              })
            })
          }

          // Broadcast milestone unlocks to all tabs
          if (result.milestonesUnlocked && result.milestonesUnlocked.length > 0) {
            result.milestonesUnlocked.forEach(milestone => {
              io.to(userRoom).emit('milestone:unlocked', { 
                milestone,
                sourceSocketId: socket.id,
              })
            })
          }
        }, 1000 + Math.random() * 2000) // 1-3 seconds delay

      } catch (error) {
        log.error('Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Typing indicators - broadcast to other tabs
    socket.on('typing:start', (characterId: string) => {
      socket.to(userRoom).emit('user:typing', { 
        characterId, 
        sourceSocketId: socket.id 
      })
    })

    socket.on('typing:stop', (characterId: string) => {
      socket.to(userRoom).emit('user:typing:stop', { 
        characterId, 
        sourceSocketId: socket.id 
      })
    })

    // Handle tab sync request - new tab requests current state
    socket.on('sync:request', () => {
      // Broadcast to other tabs to share their state
      socket.to(userRoom).emit('sync:state_request', {
        requestingSocketId: socket.id,
      })
    })

    // Handle sync response - send state to requesting tab
    socket.on('sync:response', (data: { 
      targetSocketId: string
      messages: unknown[]
      typing: boolean
    }) => {
      io.to(data.targetSocketId).emit('sync:state_receive', {
        messages: data.messages,
        typing: data.typing,
        sourceSocketId: socket.id,
      })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      // User disconnected from this tab
    })
  })

  // Helper function to send notifications (used by other modules)
  const sendNotification = (userId: string, notification: {
    type: string
    title: string
    message: string
    data?: Record<string, unknown>
  }) => {
    io.to(`user:${userId}`).emit('notification:new', notification)
  }

  return { sendNotification }
}
