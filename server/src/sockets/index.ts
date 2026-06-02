import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { cache, CacheKeys, CacheTTL } from '../lib/redis'
import { chatService } from '../modules/chat/chat.service'
import { dmService } from '../modules/dm/dm.service'
import { proactiveNotificationService } from '../modules/ai/proactive-notification.service'
import { moodService } from '../modules/character/mood.service'
import { createModuleLogger } from '../lib/logger'
import { MESSAGE_LIMITS, CACHE_TTL, RATE_LIMITS } from '../lib/constants'
import { AppError } from '../middlewares/error.middleware'
import { realtimeEvents } from '../lib/realtime-events'

const log = createModuleLogger('Socket')

// Rate limiting state (per user per event type)
const rateLimiters = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup to prevent memory leak (every 5 minutes)
const RATE_LIMITER_CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, limiter] of rateLimiters.entries()) {
    if (now > limiter.resetAt) {
      rateLimiters.delete(key)
    }
  }
}, RATE_LIMITER_CLEANUP_INTERVAL)

function checkRateLimit(userId: string, eventType: 'message' | 'dm' | 'typing'): boolean {
  const key = `${userId}:${eventType}`
  const now = Date.now()
  const config = eventType === 'message'
    ? RATE_LIMITS.SOCKET_MESSAGE_SEND
    : eventType === 'dm'
    ? RATE_LIMITS.SOCKET_DM_SEND
    : RATE_LIMITS.SOCKET_TYPING

  const limiter = rateLimiters.get(key)

  if (!limiter || now > limiter.resetAt) {
    rateLimiters.set(key, { count: 1, resetAt: now + config.WINDOW_MS })
    return true
  }

  if (limiter.count >= config.MAX_REQUESTS) {
    return false
  }

  limiter.count++
  return true
}

interface AuthenticatedSocket extends Socket {
  userId?: string
}

interface JwtPayload {
  userId: string
  email: string
}

export function setupSocketHandlers(io: Server) {
  realtimeEvents.on('character:facts_update', (payload) => {
    const { userId: targetUserId, ...eventPayload } = payload
    io.to(`user:${targetUserId}`).emit('character:facts_update', eventPayload)
  })

  realtimeEvents.on('message:receive', (payload) => {
    io.to(`user:${payload.userId}`).emit('message:receive', {
      ...payload.message,
      isOwn: false,
    })
    if (payload.notification) {
      io.to(`user:${payload.userId}`).emit('notification:new', payload.notification)
    }
  })

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
      
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!,
        { algorithms: ['HS256'] }
      ) as JwtPayload

      // Use cache-aside pattern (same as auth middleware) instead of raw DB query
      const cacheKey = CacheKeys.socketAuth(decoded.userId)
      let user = await cache.get<{ id: string; email: string }>(cacheKey)
      if (!user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true },
        })
        if (dbUser) {
          await cache.set(cacheKey, dbUser, CacheTTL.SOCKET_AUTH)
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

        // Cache character list for 5 minutes to avoid repeated DB queries
        const charCacheKey = `user:${userId}:characters:list`
        const cachedCharacters = await cache.get<Array<{ id: string; name: string }>>(charCacheKey)
        const characters = cachedCharacters ?? await prisma.character.findMany({
            where: { userId },
            select: { id: true, name: true },
          })

        if (!cachedCharacters) {
          await cache.set(charCacheKey, characters, 300) // 5 minutes
        }

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
        if (!data?.characterId) {
          socket.emit('error', { message: 'characterId is required' })
          return
        }

        const mood = await moodService.getCurrentMood(data.characterId, userId)
        // Broadcast mood update to all user's tabs
        io.to(userRoom).emit('character:mood_update', {
          characterId: data.characterId,
          ...mood,
          sourceSocketId: socket.id,
        })
      } catch (err) {
        if (err instanceof AppError) {
          socket.emit('character:mood_error', {
            characterId: data?.characterId,
            code: err.code,
            message: err.message,
          })
          return
        }

        log.error('Mood check error:', err)
        socket.emit('character:mood_error', {
          characterId: data?.characterId,
          code: 'MOOD_CHECK_FAILED',
          message: 'Unable to check mood right now',
        })
      }
    })

    // Handle sending messages
    socket.on('message:send', async (data: {
      characterId: string
      content: string
      messageType?: string
      clientId?: string
    }) => {
      try {
        // Rate limiting
        if (!checkRateLimit(userId, 'message')) {
          socket.emit('error', { message: 'Too many messages. Please slow down.' })
          return
        }

        // Input validation
        if (!data.content || typeof data.content !== 'string') {
          socket.emit('error', { message: 'Message content is required' })
          return
        }

        if (!data.characterId || typeof data.characterId !== 'string') {
          socket.emit('error', { message: 'characterId is required' })
          return
        }

        // Sanitize and validate content length
        const content = data.content.trim()
        if (content.length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' })
          return
        }
        if (content.length > MESSAGE_LIMITS.MAX_CHAT_MESSAGE_LENGTH) {
          socket.emit('error', { message: `Message too long (max ${MESSAGE_LIMITS.MAX_CHAT_MESSAGE_LENGTH} characters)` })
          return
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { premiumTier: true },
        })

        const tier = user?.premiumTier || 'FREE'
        const limitCheck = await chatService.checkDailyLimit(userId, tier)

        if (!limitCheck.canSend) {
          socket.emit('error', {
            message: `Bạn đã hết lượt tin nhắn hôm nay (${limitCheck.limit} tin). Nâng cấp VIP để nhắn không giới hạn!`,
            code: 'DAILY_LIMIT_REACHED',
            dailyUsage: {
              used: limitCheck.used,
              limit: limitCheck.limit,
              remaining: limitCheck.remaining,
              isUnlimited: limitCheck.limit === -1,
            },
          })
          return
        }

        // Atomic idempotency check — prevent duplicate processing
        if (data.clientId) {
          const dedupKey = `dedup:${userId}:${data.clientId}`
          const isNew = await cache.setNX(dedupKey, true, CACHE_TTL.DEDUPLICATION)
          if (!isNew) {
            log.debug('Duplicate message blocked:', data.clientId)
            return
          }
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
          onFactUpdates: (updates) => {
            io.to(userRoom).emit('character:facts_update', {
              ...updates,
              sourceSocketId: socket.id,
            })
          },
        })

        if (result.factUpdates) {
          io.to(userRoom).emit('character:facts_update', {
            ...result.factUpdates,
            sourceSocketId: socket.id,
          })
        }

        if (result.accountProgress) {
          io.to(userRoom).emit('user:progress_update', {
            ...result.accountProgress,
            sourceSocketId: socket.id,
          })
        }

        // Broadcast user message to ALL user's tabs (echo clientId so client can replace optimistic)
        io.to(userRoom).emit('message:receive', {
          ...result.userMessage,
          isOwn: true,
          clientId: data.clientId,
          sourceSocketId: socket.id,
        })

        // Typing delay proportional to response length (min 1.5s, max 4s)
        const responseLength = result.aiMessage.content?.length || 50;
        const typingDelay = Math.min(4000, Math.max(1500, responseLength * 25));
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
        }, typingDelay)

      } catch (error) {
        log.error('Error sending message:', error)
        if (error instanceof AppError) {
          socket.emit('error', { code: error.code, message: error.message })
          return
        }
        socket.emit('error', { code: 'MESSAGE_SEND_FAILED', message: 'Failed to send message' })
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
      currentCharacterId?: string
    }) => {
      const targetSocket = io.sockets.sockets.get(data.targetSocketId)
      if (!targetSocket || !targetSocket.rooms.has(userRoom)) {
        return
      }

      io.to(data.targetSocketId).emit('sync:state_receive', {
        messages: data.messages,
        typing: data.typing,
        currentCharacterId: data.currentCharacterId,
        sourceSocketId: socket.id,
      })
    })

    // ── Direct Message socket handlers ──
    socket.on('dm:send', async (data: {
      conversationId: string
      content: string
      clientId?: string
    }) => {
      try {
        // Rate limiting
        if (!checkRateLimit(userId, 'dm')) {
          socket.emit('error', { message: 'Too many messages. Please slow down.' })
          return
        }

        if (!data.content?.trim() || !data.conversationId) {
          socket.emit('error', { message: 'conversationId and content required' })
          return
        }

        // Validate content length
        if (data.content.trim().length > MESSAGE_LIMITS.MAX_DM_MESSAGE_LENGTH) {
          socket.emit('error', { message: `Message too long (max ${MESSAGE_LIMITS.MAX_DM_MESSAGE_LENGTH} characters)` })
          return
        }

        // Atomic idempotency
        if (data.clientId) {
          const dedupKey = `dedup_dm:${userId}:${data.clientId}`
          const isNew = await cache.setNX(dedupKey, true, CACHE_TTL.DEDUPLICATION)
          if (!isNew) {
            log.debug('Duplicate DM blocked:', data.clientId)
            return
          }
        }

        const message = await dmService.sendMessage(userId, data.conversationId, data.content)

        // Query active members from DB directly to avoid stale room membership leakage
        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId, isActive: true },
          select: { userId: true },
        })

        // Broadcast to all members' rooms
        members.forEach((member: { userId: string }) => {
          io.to(`user:${member.userId}`).emit('dm:receive', {
            ...message,
            conversationId: data.conversationId,
          })
        })
      } catch (error) {
        log.error('DM send error:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    socket.on('dm:typing', async (data: { conversationId: string }) => {
      try {
        // Rate limiting
        if (!checkRateLimit(userId, 'typing')) {
          return
        }

        // Input validation
        if (!data.conversationId) {
          return
        }

        // Ensure sender is an active member before broadcasting typing state
        const senderMembership = await prisma.conversationMember.findFirst({
          where: { conversationId: data.conversationId, userId, isActive: true },
          select: { id: true },
        })

        if (!senderMembership) {
          return
        }

        // Broadcast typing to active members using fresh membership list
        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId, isActive: true },
          select: { userId: true },
        })

        // Filter out current user and broadcast to others
        members.filter((m: { userId: string }) => m.userId !== userId).forEach((member: { userId: string }) => {
          io.to(`user:${member.userId}`).emit('dm:typing', {
            conversationId: data.conversationId,
            userId,
          })
        })
      } catch (error) {
        log.error('DM typing error:', error)
      }
    })

    socket.on('dm:read', async (data: { conversationId: string }) => {
      try {
        await dmService.markRead(userId, data.conversationId)
      } catch {}
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
