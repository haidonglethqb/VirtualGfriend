import { prisma } from '../../lib/prisma'
import { cache, CacheKeys, CacheTTL } from '../../lib/redis'
import { AppError } from '../../middlewares/error.middleware'
import { createModuleLogger } from '../../lib/logger'

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

    // Add unread counts
    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const member = conv.members.find(m => m.userId === userId)
        const unreadCount = member
          ? await prisma.directMessage.count({
              where: {
                conversationId: conv.id,
                senderId: { not: userId },
                isDeleted: false,
                createdAt: { gt: member.lastReadAt },
              },
            })
          : 0

        return { ...conv, unreadCount }
      })
    )

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
    if (!trimmed || trimmed.length > 2000) {
      throw new AppError('Invalid message content', 400, 'INVALID_CONTENT')
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
   * Get total unread message count across all conversations
   */
  async getTotalUnreadCount(userId: string) {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId, isActive: true },
      select: { conversationId: true, lastReadAt: true },
    })

    if (memberships.length === 0) return 0

    let totalUnread = 0
    for (const m of memberships) {
      totalUnread += await prisma.directMessage.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: userId },
          isDeleted: false,
          createdAt: { gt: m.lastReadAt },
        },
      })
    }

    return totalUnread
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
