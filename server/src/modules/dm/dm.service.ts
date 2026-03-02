import { prisma } from '../../lib/prisma'
import { cache, CacheKeys, CacheTTL } from '../../lib/redis'
import { AppError } from '../../middlewares/error.middleware'
import { createModuleLogger } from '../../lib/logger'
import { MESSAGE_LIMITS } from '../../lib/constants'

const log = createModuleLogger('DM')

export const dmService = {
  /**
   * Get or create a 1-on-1 conversation between two users
   */
  async getOrCreateConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new AppError('Cannot message yourself', 400, 'SELF_MESSAGE')
    }

    // Check target user exists and allows messages
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, username: true, avatar: true },
    })
    if (!targetUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    const targetSettings = await prisma.userSettings.findUnique({
      where: { userId: targetUserId },
      select: { allowMessages: true },
    })
    if (targetSettings && !targetSettings.allowMessages) {
      throw new AppError('User does not accept messages', 403, 'MESSAGES_DISABLED')
    }

    // Find existing 1-on-1 conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId, isActive: true } } },
          { members: { some: { userId: targetUserId, isActive: true } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatar: true } },
          },
        },
      },
    })

    if (existing) return existing

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [
            { userId, role: 'member' },
            { userId: targetUserId, role: 'member' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatar: true } },
          },
        },
      },
    })

    log.info(`Conversation created: ${conversation.id} between ${userId} and ${targetUserId}`)
    return conversation
  },

  /**
   * Create a group conversation
   */
  async createGroupConversation(creatorId: string, name: string, memberIds: string[]) {
    const uniqueMembers = [...new Set([creatorId, ...memberIds])]
    if (uniqueMembers.length < 3) {
      throw new AppError('Group must have at least 3 members', 400, 'MIN_GROUP_SIZE')
    }
    if (uniqueMembers.length > 50) {
      throw new AppError('Group cannot exceed 50 members', 400, 'MAX_GROUP_SIZE')
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: true,
        name,
        members: {
          create: uniqueMembers.map(id => ({
            userId: id,
            role: id === creatorId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatar: true } },
          },
        },
      },
    })

    log.info(`Group "${name}" created by ${creatorId} with ${uniqueMembers.length} members`)
    return conversation
  },

  /**
   * List user's conversations
   */
  async getConversations(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(1, limit), 50)
    const skip = (page - 1) * safeLimit

    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId, isActive: true } },
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, displayName: true, username: true, avatar: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: safeLimit,
    })

    const total = await prisma.conversation.count({
      where: {
        members: { some: { userId, isActive: true } },
      },
    })

    // Add unread counts efficiently
    // If no conversations, return early
    if (conversations.length === 0) {
      return { conversations: [], total, page, limit: safeLimit }
    }

    // Get unread counts for all conversations in a single query
    const unreadCounts = await prisma.$queryRaw<Array<{ conversationId: string; unreadCount: bigint }>>`
      SELECT
        cm."conversationId",
        COUNT(dm.id)::bigint as "unreadCount"
      FROM "conversation_members" cm
      LEFT JOIN "direct_messages" dm ON dm."conversationId" = cm."conversationId"
        AND dm."senderId" != ${userId}
        AND dm."isDeleted" = false
        AND dm."createdAt" > cm."lastReadAt"
      WHERE cm."userId" = ${userId}
        AND cm."isActive" = true
        AND cm."conversationId" = ANY(${conversations.map(c => c.id)})
      GROUP BY cm."conversationId"
    `

    // Map unread counts
    const unreadMap = new Map(
      unreadCounts.map((uc) => [uc.conversationId, Number(uc.unreadCount)])
    )

    const withUnread = conversations.map((conv) => ({
      ...conv,
      unreadCount: unreadMap.get(conv.id) || 0
    }))

    return { conversations: withUnread, total, page, limit: safeLimit }
  },

  /**
   * Send a direct message
   */
  async sendMessage(userId: string, conversationId: string, content: string, messageType = 'TEXT') {
    // Verify user is a member
    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId, userId, isActive: true },
    })
    if (!membership) {
      throw new AppError('Not a member of this conversation', 403, 'NOT_MEMBER')
    }

    const trimmed = content.trim()
    if (!trimmed || trimmed.length > MESSAGE_LIMITS.MAX_DM_MESSAGE_LENGTH) {
      throw new AppError(`Invalid message content (max ${MESSAGE_LIMITS.MAX_DM_MESSAGE_LENGTH} characters)`, 400, 'INVALID_CONTENT')
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: trimmed,
        messageType: messageType as 'TEXT',
      },
      include: {
        sender: { select: { id: true, displayName: true, username: true, avatar: true } },
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Update sender's lastReadAt
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    })

    return message
  },

  /**
   * Get messages in a conversation with cursor-based pagination
   */
  async getMessages(userId: string, conversationId: string, limit = 50, cursor?: string) {
    // Verify membership
    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId, userId, isActive: true },
    })
    if (!membership) {
      throw new AppError('Not a member of this conversation', 403, 'NOT_MEMBER')
    }

    const safeLimit = Math.min(Math.max(1, limit), 100)

    let cursorFilter = {}
    if (cursor) {
      const cursorDate = new Date(cursor)
      if (!isNaN(cursorDate.getTime())) {
        cursorFilter = { createdAt: { lt: cursorDate } }
      }
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId,
        isDeleted: false,
        ...cursorFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit + 1,
      include: {
        sender: { select: { id: true, displayName: true, username: true, avatar: true } },
      },
    })

    const hasMore = messages.length > safeLimit
    if (hasMore) messages.pop()

    // Mark as read
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    })

    // messages are ordered desc: [newest, ..., oldest]
    // nextCursor should be the oldest message's createdAt for "load older" pagination
    const nextCursor = hasMore ? messages[messages.length - 1]?.createdAt?.toISOString() : undefined

    return {
      messages: messages.reverse(),
      hasMore,
      nextCursor,
    }
  },

  /**
   * Mark conversation as read
   */
  async markRead(userId: string, conversationId: string) {
    const membership = await prisma.conversationMember.findFirst({
      where: { conversationId, userId, isActive: true },
    })
    if (!membership) {
      throw new AppError('Not a member', 403, 'NOT_MEMBER')
    }

    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    })
  },

  /**
   * Get total unread message count across all conversations - Optimized to avoid N+1
   */
  async getTotalUnreadCount(userId: string) {
    // Use a single aggregated query instead of looping through memberships
    const result = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(dm.id)::bigint as total
      FROM "conversation_members" cm
      INNER JOIN "direct_messages" dm ON dm."conversationId" = cm."conversationId"
        AND dm."senderId" != ${userId}
        AND dm."isDeleted" = false
        AND dm."createdAt" > cm."lastReadAt"
      WHERE cm."userId" = ${userId}
        AND cm."isActive" = true
    `

    return result.length > 0 ? Number(result[0].total) : 0
  },

  /**
   * Search users for starting a new conversation
   */
  async searchUsers(query: string, currentUserId: string, limit = 20) {
    const safeLimit = Math.min(Math.max(1, limit), 50)

    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        // Include users that either have no settings (defaults allow messages)
        // or have allowMessages/profilePublic enabled
        NOT: {
          settings: {
            allowMessages: false,
            profilePublic: false,
          },
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isPremium: true,
      },
      take: safeLimit,
    })
  },
}
