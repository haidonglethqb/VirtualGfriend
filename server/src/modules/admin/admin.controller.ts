import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AdminRequest, verifyAdminPassword, generateAdminToken } from './admin.middleware';

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
