import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AdminRequest, verifyAdminPassword, generateAdminToken } from './admin.middleware';
import { io } from '../../index';

// ============== AUTH ==============
export async function adminLogin(req: Request, res: Response) {
  const { username, password } = req.body;

  if (username !== 'admin') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateAdminToken(username);
  res.json({ token, message: 'Admin login successful' });
}

export async function getUsers(req: AdminRequest, res: Response) {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = search
    ? {
        OR: [
          { email: { contains: String(search), mode: 'insensitive' as const } },
          { username: { contains: String(search), mode: 'insensitive' as const } },
          { displayName: { contains: String(search), mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isEmailVerified: true,
        isPremium: true,
        premiumTier: true,
        coins: true,
        gems: true,
        streak: true,
        createdAt: true,
        lastLoginAt: true,
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function getUser(req: AdminRequest, res: Response) {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      isEmailVerified: true,
      isPremium: true,
      premiumTier: true,
      premiumExpiresAt: true,
      coins: true,
      gems: true,
      streak: true,
      userGender: true,
      datingPreference: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      _count: {
        select: {
          characters: true,
          messages: true,
          memories: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
}

export async function updateUser(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const { coins, gems, isPremium, premiumTier, premiumExpiresAt, isEmailVerified } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(coins !== undefined && { coins }),
      ...(gems !== undefined && { gems }),
      ...(isPremium !== undefined && { isPremium }),
      ...(premiumTier !== undefined && { premiumTier }),
      ...(premiumExpiresAt !== undefined && { premiumExpiresAt: new Date(premiumExpiresAt) }),
      ...(isEmailVerified !== undefined && { isEmailVerified }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      coins: true,
      gems: true,
      isPremium: true,
      premiumTier: true,
    },
  });

  res.json({ message: 'User updated', user });
}

export async function deleteUser(req: AdminRequest, res: Response) {
  const { id } = req.params;

  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
}

export async function getCharacters(req: AdminRequest, res: Response) {
  const { page = 1, limit = 20, userId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = userId ? { userId: String(userId) } : {};

  const [characters, total] = await Promise.all([
    prisma.character.findMany({
      where,
      include: {
        user: { select: { email: true, username: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.character.count({ where }),
  ]);

  res.json({
    characters,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function getStats(req: AdminRequest, res: Response) {
  const [
    totalUsers,
    premiumUsers,
    totalCharacters,
    totalMessages,
    activeUsersToday,
    newUsersToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.character.count(),
    prisma.message.count(),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  res.json({
    totalUsers,
    premiumUsers,
    totalCharacters,
    totalMessages,
    activeUsersToday,
    newUsersToday,
    premiumRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0,
  });
}

export async function resetUserPassword(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  res.json({ message: 'Password reset successful' });
}

export async function getQuests(req: AdminRequest, res: Response) {
  const quests = await prisma.quest.findMany({
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
  });
  res.json(quests);
}

export async function getCharacterTemplates(req: AdminRequest, res: Response) {
  const templates = await prisma.characterTemplate.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  res.json(templates);
}

// ============== CHARACTER MANAGEMENT ==============
export async function getCharacter(req: AdminRequest, res: Response) {
  const { id } = req.params;

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, username: true } },
      template: true,
      _count: {
        select: {
          messages: true,
          memories: true,
        },
      },
    },
  });

  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }

  res.json(character);
}

export async function updateCharacter(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const { name, nickname, personality, mood, level, experience, affection, isActive } = req.body;

  const character = await prisma.character.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(nickname !== undefined && { nickname }),
      ...(personality !== undefined && { personality }),
      ...(mood !== undefined && { mood }),
      ...(level !== undefined && { level }),
      ...(experience !== undefined && { experience }),
      ...(affection !== undefined && { affection }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.json({ message: 'Character updated', character });
}

export async function deleteCharacter(req: AdminRequest, res: Response) {
  const { id } = req.params;

  // Delete related data first
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { characterId: id } }),
    prisma.memory.deleteMany({ where: { characterId: id } }),
    prisma.characterFact.deleteMany({ where: { characterId: id } }),
    prisma.characterScene.deleteMany({ where: { characterId: id } }),
    prisma.giftHistory.deleteMany({ where: { characterId: id } }),
    prisma.character.delete({ where: { id } }),
  ]);

  res.json({ message: 'Character and all related data deleted' });
}

// ============== MESSAGE MANAGEMENT ==============
export async function getMessages(req: AdminRequest, res: Response) {
  const { page = 1, limit = 50, userId, characterId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: Record<string, unknown> = {};
  if (userId) where.userId = String(userId);
  if (characterId) where.characterId = String(characterId);

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        user: { select: { email: true, username: true } },
        character: { select: { name: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.message.count({ where }),
  ]);

  res.json({
    messages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function deleteMessage(req: AdminRequest, res: Response) {
  const { id } = req.params;

  await prisma.message.delete({ where: { id } });
  res.json({ message: 'Message deleted' });
}

export async function deleteMessagesBulk(req: AdminRequest, res: Response) {
  const { userId, characterId, before } = req.body;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (characterId) where.characterId = characterId;
  if (before) where.createdAt = { lt: new Date(before) };

  const result = await prisma.message.deleteMany({ where });
  res.json({ message: `Deleted ${result.count} messages` });
}

// ============== QUEST MANAGEMENT ==============
export async function createQuest(req: AdminRequest, res: Response) {
  const {
    title,
    description,
    type,
    category,
    requirements,
    rewardXp,
    rewardCoins,
    rewardGems,
    rewardAffection,
    unlockLevel,
    requiresPremium,
    sortOrder,
    isActive,
  } = req.body;

  const quest = await prisma.quest.create({
    data: {
      title,
      description,
      type: type || 'DAILY',
      category: category || 'chat',
      requirements: requirements || {},
      rewardXp: rewardXp || 0,
      rewardCoins: rewardCoins || 0,
      rewardGems: rewardGems || 0,
      rewardAffection: rewardAffection || 0,
      unlockLevel: unlockLevel || 1,
      requiresPremium: requiresPremium || false,
      sortOrder: sortOrder || 0,
      isActive: isActive !== false,
    },
  });

  res.json({ message: 'Quest created', quest });
}

export async function updateQuest(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const data = req.body;

  const quest = await prisma.quest.update({
    where: { id },
    data,
  });

  res.json({ message: 'Quest updated', quest });
}

export async function deleteQuest(req: AdminRequest, res: Response) {
  const { id } = req.params;

  await prisma.$transaction([
    prisma.userQuest.deleteMany({ where: { questId: id } }),
    prisma.quest.delete({ where: { id } }),
  ]);

  res.json({ message: 'Quest deleted' });
}

export async function toggleQuestActive(req: AdminRequest, res: Response) {
  const { id } = req.params;

  const quest = await prisma.quest.findUnique({ where: { id } });
  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  const updated = await prisma.quest.update({
    where: { id },
    data: { isActive: !quest.isActive },
  });

  res.json({ message: `Quest ${updated.isActive ? 'activated' : 'deactivated'}`, quest: updated });
}

// ============== TEMPLATE MANAGEMENT ==============
export async function createTemplate(req: AdminRequest, res: Response) {
  const { name, description, avatarUrl, gender, personality, style, isDefault, isActive, sortOrder } = req.body;

  const template = await prisma.characterTemplate.create({
    data: {
      name,
      description,
      avatarUrl,
      gender: gender || 'FEMALE',
      personality: personality || 'caring',
      style: style || 'anime',
      isDefault: isDefault || false,
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
    },
  });

  res.json({ message: 'Template created', template });
}

export async function updateTemplate(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const data = req.body;

  const template = await prisma.characterTemplate.update({
    where: { id },
    data,
  });

  res.json({ message: 'Template updated', template });
}

export async function deleteTemplate(req: AdminRequest, res: Response) {
  const { id } = req.params;

  // Check if template is in use
  const charactersUsingTemplate = await prisma.character.count({
    where: { templateId: id },
  });

  if (charactersUsingTemplate > 0) {
    return res.status(400).json({
      error: `Cannot delete template: ${charactersUsingTemplate} characters are using it`,
    });
  }

  await prisma.characterTemplate.delete({ where: { id } });
  res.json({ message: 'Template deleted' });
}

export async function toggleTemplateActive(req: AdminRequest, res: Response) {
  const { id } = req.params;

  const template = await prisma.characterTemplate.findUnique({ where: { id } });
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const updated = await prisma.characterTemplate.update({
    where: { id },
    data: { isActive: !template.isActive },
  });

  res.json({ message: `Template ${updated.isActive ? 'activated' : 'deactivated'}`, template: updated });
}

// ============== BULK ACTIONS ==============
export async function giveCoinsToAll(req: AdminRequest, res: Response) {
  const { amount, onlyFree, onlyPremium } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  const where: Record<string, unknown> = {};
  if (onlyFree) where.isPremium = false;
  if (onlyPremium) where.isPremium = true;

  const result = await prisma.user.updateMany({
    where,
    data: { coins: { increment: amount } },
  });

  res.json({ message: `Gave ${amount} coins to ${result.count} users` });
}

export async function giveGemsToAll(req: AdminRequest, res: Response) {
  const { amount, onlyFree, onlyPremium } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  const where: Record<string, unknown> = {};
  if (onlyFree) where.isPremium = false;
  if (onlyPremium) where.isPremium = true;

  const result = await prisma.user.updateMany({
    where,
    data: { gems: { increment: amount } },
  });

  res.json({ message: `Gave ${amount} gems to ${result.count} users` });
}

export async function giveToUser(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const { coins, gems } = req.body;

  const data: Record<string, unknown> = {};
  if (coins) data.coins = { increment: coins };
  if (gems) data.gems = { increment: gems };

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, coins: true, gems: true },
  });

  res.json({ message: 'Rewards given', user });
}

// ============== ANALYTICS ==============
export async function getAnalytics(req: AdminRequest, res: Response) {
  try {
    const { days = 7 } = req.query;
    const daysNum = Math.min(Number(days) || 7, 365);

    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Use SQL aggregation instead of loading all records into memory
    const [usersByDate, messagesByDate, topUsers, premiumDistribution, activeUsersPerDay] = await Promise.all([
      // User registrations per day
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
        FROM "users"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      // Messages per day
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
        FROM "messages"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      // Top users by messages
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          _count: { select: { messages: true } },
        },
        orderBy: { messages: { _count: 'desc' } },
        take: 10,
      }),
      // Premium tier distribution
      prisma.user.groupBy({
        by: ['premiumTier'],
        _count: true,
      }),
      // Active users per day (users who sent messages)
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(DISTINCT "userId")::bigint as count
        FROM "messages"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
    ]);

    // Build date maps for quick lookup
    const userMap = new Map(usersByDate.map(d => [new Date(d.date).toISOString().split('T')[0], Number(d.count)]));
    const messageMap = new Map(messagesByDate.map(d => [new Date(d.date).toISOString().split('T')[0], Number(d.count)]));
    const activeUserMap = new Map(activeUsersPerDay.map(d => [new Date(d.date).toISOString().split('T')[0], Number(d.count)]));

    // Generate all dates in range
    const allDates: string[] = [];
    for (let i = 0; i < daysNum; i++) {
      const d = new Date(Date.now() - (daysNum - 1 - i) * 24 * 60 * 60 * 1000);
      allDates.push(d.toISOString().split('T')[0]);
    }

    // Build daily stats with all dates
    const dailyStats = allDates.map(date => ({
      date,
      new_users: userMap.get(date) || 0,
      messages: messageMap.get(date) || 0,
      active_users: activeUserMap.get(date) || 0,
    }));

    // Build message stats with all dates
    const messageStats = allDates.map(date => ({
      date,
      count: messageMap.get(date) || 0,
    }));

    res.json({
      dailyStats,
      messageStats,
      topUsers: topUsers.map(u => ({ 
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        messageCount: u._count.messages 
      })),
      premiumDistribution,
    });
  } catch (error) {
    console.error('[Admin] Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// ============== SYSTEM ==============
export async function getSystemInfo(req: AdminRequest, res: Response) {
  const [
    dbSize,
    tableStats,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `,
    prisma.$queryRaw<Array<{ table_name: string; row_count: bigint }>>`
      SELECT 
        relname as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `,
  ]);

  res.json({
    databaseSize: dbSize[0]?.size || 'Unknown',
    tables: tableStats.map(t => ({ name: t.table_name, rows: Number(t.row_count) })),
    nodeVersion: process.version,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
}

export async function cleanupData(req: AdminRequest, res: Response) {
  const { action } = req.body;

  let result = { message: '', count: 0 };

  switch (action) {
    case 'expired_tokens':
      const tokenResult = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });
      result = { message: 'Expired tokens cleaned', count: tokenResult.count };
      break;

    case 'inactive_users':
      // Users who haven't logged in for 90 days and have no premium
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveCount = await prisma.user.count({
        where: {
          lastLoginAt: { lt: ninetyDaysAgo },
          isPremium: false,
        },
      });
      result = { message: `Found ${inactiveCount} inactive users (not deleted - manual review required)`, count: inactiveCount };
      break;

    case 'old_messages':
      // Delete messages older than 180 days for non-premium users
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const msgResult = await prisma.message.deleteMany({
        where: {
          createdAt: { lt: sixMonthsAgo },
          user: { isPremium: false },
        },
      });
      result = { message: 'Old messages cleaned', count: msgResult.count };
      break;

    default:
      return res.status(400).json({ error: 'Unknown cleanup action' });
  }

  res.json(result);
}

// ============== BROADCAST ==============
export async function broadcastNotification(req: AdminRequest, res: Response) {
  const { title, message, type = 'info' } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  // Emit to all connected clients via Socket.IO
  io.emit('admin:broadcast', {
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
  });

  res.json({ message: 'Broadcast sent to all connected users' });
}

// ============== GIFT/SHOP MANAGEMENT ==============
export async function getGiftHistory(req: AdminRequest, res: Response) {
  const { page = 1, limit = 50, userId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = userId ? { userId: String(userId) } : {};

  const [gifts, total] = await Promise.all([
    prisma.giftHistory.findMany({
      where,
      include: {
        user: { select: { email: true, username: true } },
        character: { select: { name: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.giftHistory.count({ where }),
  ]);

  res.json({
    gifts,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

// ============== MEMORIES ==============
export async function getMemories(req: AdminRequest, res: Response) {
  const { page = 1, limit = 50, userId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = userId ? { userId: String(userId) } : {};

  const [memories, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      include: {
        user: { select: { email: true, username: true } },
        character: { select: { name: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.memory.count({ where }),
  ]);

  res.json({
    memories,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}

export async function deleteMemory(req: AdminRequest, res: Response) {
  const { id } = req.params;

  await prisma.memory.delete({ where: { id } });
  res.json({ message: 'Memory deleted' });
}

// ============== CLEANUP DUPLICATES ==============
// Normalize Vietnamese names (remove diacritics for comparison)
function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export async function cleanupDuplicateTemplates(req: AdminRequest, res: Response) {
  // Find all templates grouped by normalized name (catches "Hương" vs "Huong")
  const templates = await prisma.characterTemplate.findMany({
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  const nameMap = new Map<string, typeof templates>();
  
  for (const template of templates) {
    const normalizedName = normalizeVietnamese(template.name);
    const existing = nameMap.get(normalizedName);
    if (existing) {
      existing.push(template);
    } else {
      nameMap.set(normalizedName, [template]);
    }
  }

  const duplicates: string[] = [];
  const deleted: string[] = [];

  for (const [normalizedName, items] of nameMap.entries()) {
    if (items.length > 1) {
      duplicates.push(`${normalizedName}: ${items.map(i => `"${i.name}"`).join(', ')}`);
      
      // Keep the one with Vietnamese diacritics (proper name) and valid avatar
      const withDiacritics = items.find(t => t.name !== normalizeVietnamese(t.name));
      const withAvatar = items.find(t => t.avatarUrl && t.avatarUrl.trim() !== '');
      const keep = withDiacritics || withAvatar || items[0];
      const toDelete = items.filter(t => t.id !== keep.id);
      
      for (const item of toDelete) {
        // Check if any characters use this template
        const usageCount = await prisma.character.count({
          where: { templateId: item.id },
        });
        
        if (usageCount > 0) {
          // Update characters to use the kept template
          await prisma.character.updateMany({
            where: { templateId: item.id },
            data: { templateId: keep.id },
          });
          deleted.push(`"${item.name}" - migrated ${usageCount} characters to "${keep.name}"`);
        } else {
          deleted.push(`"${item.name}"`);
        }
        
        await prisma.characterTemplate.delete({ where: { id: item.id } });
      }
    }
  }

  res.json({
    message: 'Duplicate cleanup completed',
    duplicatesFound: duplicates,
    deleted,
  });
}

export async function fixMissingAvatars(req: AdminRequest, res: Response) {
  // Find templates with empty or invalid avatar URLs
  const templates = await prisma.characterTemplate.findMany();
  
  const issues: string[] = [];
  
  for (const template of templates) {
    if (!template.avatarUrl || template.avatarUrl.trim() === '') {
      issues.push(`${template.name}: Missing avatar URL`);
    }
  }

  res.json({
    totalTemplates: templates.length,
    issues,
  });
}
