import { Request, Response } from 'express';
import { DatingPreference, PremiumTier, Prisma, UserGender } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AdminRequest, verifyAdminPassword, generateAdminToken, isAdminUsername, isAdminConfigured } from './admin.middleware';
import { io } from '../../index';
import { templateService } from '../character/template.service';

const MIN_BROADCAST_DURATION_MS = 1000;
const MAX_BROADCAST_DURATION_MS = 60000;
const DEFAULT_BROADCAST_DURATION_MS = 5000;
const TEMPLATE_GENDERS = ['FEMALE', 'MALE', 'NON_BINARY', 'OTHER'] as const;
type TemplateGender = (typeof TEMPLATE_GENDERS)[number];
const VALID_TEMPLATE_GENDERS = new Set<TemplateGender>(TEMPLATE_GENDERS);
const PREMIUM_TIERS = Object.values(PremiumTier);
const USER_GENDERS = Object.values(UserGender);
const DATING_PREFERENCES = Object.values(DatingPreference);
type AdminTargetType = 'all' | 'free' | 'premium' | 'tier' | 'selected_users';
type AdminTarget = { type: AdminTargetType; tiers?: PremiumTier[]; userIds?: string[] };

function parseTemplateGender(value: unknown): TemplateGender | null {
  const normalized = String(value || '').trim() as TemplateGender;
  if (!normalized || !VALID_TEMPLATE_GENDERS.has(normalized)) return null;
  return normalized;
}

function parseBroadcastDuration(durationMs: unknown): number {
  if (durationMs === undefined || durationMs === null) return DEFAULT_BROADCAST_DURATION_MS;
  const parsed = Number(durationMs);
  if (!Number.isFinite(parsed)) return DEFAULT_BROADCAST_DURATION_MS;
  return Math.min(MAX_BROADCAST_DURATION_MS, Math.max(MIN_BROADCAST_DURATION_MS, Math.floor(parsed)));
}

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

function parseNonNegativeInt(value: unknown, field: string, errors: string[]): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    errors.push(`${field} must be a non-negative integer`);
    return undefined;
  }
  return parsed;
}

function normalizeAdminTarget(body: Record<string, unknown>): AdminTarget {
  const rawTarget = body.target && typeof body.target === 'object' ? body.target as Record<string, unknown> : null;
  const legacyTarget = String(body.targetFilter || 'all');
  const rawType = String(rawTarget?.type || legacyTarget);
  const type: AdminTargetType = ['all', 'free', 'premium', 'tier', 'selected_users'].includes(rawType)
    ? rawType as AdminTargetType
    : 'all';

  const tiers = Array.isArray(rawTarget?.tiers)
    ? rawTarget.tiers.filter((tier): tier is PremiumTier => PREMIUM_TIERS.includes(String(tier) as PremiumTier))
    : [];
  const userIds = Array.isArray(rawTarget?.userIds)
    ? rawTarget.userIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  return { type, tiers, userIds };
}

function buildUserTargetWhere(target: AdminTarget): Prisma.UserWhereInput {
  switch (target.type) {
    case 'free':
      return { isPremium: false };
    case 'premium':
      return { isPremium: true };
    case 'tier':
      return target.tiers?.length ? { premiumTier: { in: target.tiers } } : { id: { in: [] } };
    case 'selected_users':
      return target.userIds?.length ? { id: { in: target.userIds } } : { id: { in: [] } };
    case 'all':
    default:
      return {};
  }
}

function validateTemplateInput(payload: Record<string, unknown>, isPatch: boolean) {
  const errors: string[] = [];

  if (!isPatch || payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (!name || name.length < 2) errors.push('Template name must be at least 2 characters');
  }

  if (!isPatch || payload.description !== undefined) {
    const description = String(payload.description || '').trim();
    if (!description || description.length < 5) errors.push('Template description must be at least 5 characters');
  }

  if (!isPatch || payload.avatarUrl !== undefined) {
    const avatarUrl = String(payload.avatarUrl || '').trim();
    if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
      errors.push('Template avatarUrl must be a valid URL');
    }
  }

  if (payload.sortOrder !== undefined && (!Number.isFinite(Number(payload.sortOrder)) || Number(payload.sortOrder) < 0)) {
    errors.push('Template sortOrder must be a non-negative number');
  }

  if (!isPatch || payload.gender !== undefined) {
    const gender = String(payload.gender || '').trim();
    if (gender && !parseTemplateGender(gender)) {
      errors.push('Template gender must be one of FEMALE, MALE, NON_BINARY, OTHER');
    }
  }

  return errors;
}

// ============== AUTH ==============
export async function adminLogin(req: Request, res: Response) {
  const rawUsername = req.body?.username;
  const rawPassword = req.body?.password;
  const username = String(rawUsername || '').trim();
  const password = String(rawPassword || '');

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!isAdminConfigured()) {
    return res.status(503).json({ error: 'Admin authentication is not configured' });
  }

  if (!isAdminUsername(username)) {
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
  const payload = req.body as Record<string, unknown>;
  const errors: string[] = [];

  const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!existingUser) return res.status(404).json({ error: 'User not found' });

  const data: Prisma.UserUpdateInput = {};

  if (payload.email !== undefined) {
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email is invalid');
    } else {
      const duplicate = await prisma.user.findFirst({ where: { email, id: { not: id } }, select: { id: true } });
      if (duplicate) errors.push('Email already exists');
      data.email = email;
    }
  }

  if (payload.username !== undefined) {
    const username = String(payload.username || '').trim();
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters');
    } else {
      const duplicate = await prisma.user.findFirst({ where: { username, id: { not: id } }, select: { id: true } });
      if (duplicate) errors.push('Username already exists');
      data.username = username;
    }
  }

  if (payload.displayName !== undefined) data.displayName = String(payload.displayName || '').trim() || null;
  if (payload.bio !== undefined) data.bio = String(payload.bio || '').trim() || null;

  if (payload.userGender !== undefined) {
    const gender = String(payload.userGender) as UserGender;
    if (!USER_GENDERS.includes(gender)) errors.push('userGender is invalid');
    else data.userGender = gender;
  }

  if (payload.datingPreference !== undefined) {
    const preference = String(payload.datingPreference) as DatingPreference;
    if (!DATING_PREFERENCES.includes(preference)) errors.push('datingPreference is invalid');
    else data.datingPreference = preference;
  }

  const coins = parseNonNegativeInt(payload.coins, 'coins', errors);
  const gems = parseNonNegativeInt(payload.gems, 'gems', errors);
  if (coins !== undefined) data.coins = coins;
  if (gems !== undefined) data.gems = gems;

  if (payload.isPremium !== undefined) data.isPremium = Boolean(payload.isPremium);

  if (payload.premiumTier !== undefined) {
    const tier = String(payload.premiumTier) as PremiumTier;
    if (!PREMIUM_TIERS.includes(tier)) errors.push('premiumTier is invalid');
    else {
      data.premiumTier = tier;
      data.isPremium = tier !== PremiumTier.FREE;
    }
  }

  if (payload.premiumExpiresAt !== undefined) {
    if (payload.premiumExpiresAt === null || payload.premiumExpiresAt === '') {
      data.premiumExpiresAt = null;
    } else {
      const expiresAt = new Date(String(payload.premiumExpiresAt));
      if (Number.isNaN(expiresAt.getTime())) errors.push('premiumExpiresAt is invalid');
      else data.premiumExpiresAt = expiresAt;
    }
  }

  if (payload.isEmailVerified !== undefined) data.isEmailVerified = Boolean(payload.isEmailVerified);

  if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      coins: true,
      gems: true,
      isPremium: true,
      premiumTier: true,
      premiumExpiresAt: true,
      isEmailVerified: true,
      userGender: true,
      datingPreference: true,
      streak: true,
      createdAt: true,
      lastLoginAt: true,
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

  const errors = validateTemplateInput(req.body || {}, false);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0] });
  }

  const trimmedName = String(name).trim();
  const existing = await prisma.characterTemplate.findFirst({ where: { name: trimmedName } });
  if (existing) {
    return res.status(409).json({ error: 'Template name already exists' });
  }

  const template = await prisma.characterTemplate.create({
    data: {
      name: trimmedName,
      description: String(description).trim(),
      avatarUrl: String(avatarUrl).trim(),
      gender: parseTemplateGender(gender) || 'FEMALE',
      personality: personality || 'caring',
      style: style || 'anime',
      isDefault: isDefault === true,
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    },
  });

  await templateService.invalidateCache();

  res.json({ message: 'Template created', template });
}

export async function updateTemplate(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const data = req.body || {};

  const errors = validateTemplateInput(data, true);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0] });
  }

  if (data.name !== undefined) {
    const nextName = String(data.name).trim();
    const duplicate = await prisma.characterTemplate.findFirst({
      where: {
        name: nextName,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Template name already exists' });
    }
    data.name = nextName;
  }

  if (data.description !== undefined) data.description = String(data.description).trim();
  if (data.avatarUrl !== undefined) data.avatarUrl = String(data.avatarUrl).trim();
  if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder);
  if (data.gender !== undefined) data.gender = String(data.gender).trim();
  if (data.isDefault !== undefined) data.isDefault = data.isDefault === true;
  if (data.isActive !== undefined) data.isActive = data.isActive !== false;

  const template = await prisma.characterTemplate.update({
    where: { id },
    data,
  });

  await templateService.invalidateCache();

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
  await templateService.invalidateCache();
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

  await templateService.invalidateCache();

  res.json({ message: `Template ${updated.isActive ? 'activated' : 'deactivated'}`, template: updated });
}

// ============== BULK ACTIONS ==============
export async function giveToUser(req: AdminRequest, res: Response) {
  const { id } = req.params;
  const { coins, gems } = req.body;
  const coinAmount = parsePositiveInt(coins);
  const gemAmount = parsePositiveInt(gems);

  if (coinAmount <= 0 && gemAmount <= 0) {
    return res.status(400).json({ error: 'At least one positive reward amount is required' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(coinAmount > 0 && { coins: { increment: coinAmount } }),
      ...(gemAmount > 0 && { gems: { increment: gemAmount } }),
    },
    select: { id: true, email: true, coins: true, gems: true },
  });

  await prisma.notification.create({
    data: {
      userId: id,
      type: 'REWARD',
      title: 'Admin reward',
      message: `You received ${coinAmount} coins and ${gemAmount} gems.`,
      data: { source: 'admin_reward', coins: coinAmount, gems: gemAmount },
    },
  });

  io.to(`user:${id}`).emit('user:balance_update', { coins: user.coins, gems: user.gems, source: 'admin_reward' });
  io.to(`user:${id}`).emit('notification:new', {
    type: 'reward',
    title: 'Admin reward',
    message: `You received ${coinAmount} coins and ${gemAmount} gems.`,
    data: { source: 'admin_reward', coins: coinAmount, gems: gemAmount },
    timestamp: new Date().toISOString(),
  });

  res.json({ message: 'Rewards given', user });
}

async function sendBulkRewards(payload: Record<string, unknown>) {
  const coins = parsePositiveInt(payload.coins);
  const gems = parsePositiveInt(payload.gems);
  const message = String(payload.message || '').trim() || 'Bạn đã nhận được phần thưởng từ quản trị viên.';
  const target = normalizeAdminTarget(payload);
  const where = buildUserTargetWhere(target);

  if (coins <= 0 && gems <= 0) {
    return { status: 400, body: { error: 'At least one positive reward amount is required' } };
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, coins: true, gems: true },
  });

  if (users.length === 0) {
    return { status: 200, body: { message: 'No users matched target', affected: 0, deliveredRealtime: 0 } };
  }

  await prisma.user.updateMany({
    where,
    data: {
      ...(coins > 0 && { coins: { increment: coins } }),
      ...(gems > 0 && { gems: { increment: gems } }),
    },
  });

  const notificationData = {
    source: 'admin_reward',
    coins,
    gems,
    target,
    sentAt: new Date().toISOString(),
  };

  const batchSize = 500;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await prisma.notification.createMany({
      data: batch.map((user) => ({
        userId: user.id,
        type: 'REWARD',
        title: 'Phần thưởng',
        message,
        data: notificationData,
      })),
    });
  }

  let deliveredRealtime = 0;
  for (const user of users) {
    const room = `user:${user.id}`;
    const socketCount = io.sockets.adapter.rooms.get(room)?.size || 0;
    if (socketCount === 0) continue;
    deliveredRealtime += socketCount;
    const updatedBalance = { coins: user.coins + coins, gems: user.gems + gems, source: 'admin_reward' };
    io.to(room).emit('user:balance_update', updatedBalance);
    io.to(room).emit('notification:new', {
      type: 'reward',
      title: 'Phần thưởng',
      message,
      data: notificationData,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    status: 200,
    body: {
      message: `Gave rewards to ${users.length} users`,
      affected: users.length,
      deliveredRealtime,
    },
  };
}

export async function giveBulkRewards(req: AdminRequest, res: Response) {
  const result = await sendBulkRewards(req.body as Record<string, unknown>);
  res.status(result.status).json(result.body);
}

export async function giveCoinsToAll(req: AdminRequest, res: Response) {
  const body = req.body as Record<string, unknown>;
  const result = await sendBulkRewards({
    ...body,
    coins: body.amount,
    gems: 0,
    target: { type: body.onlyFree ? 'free' : body.onlyPremium ? 'premium' : 'all' },
  });
  res.status(result.status).json(result.body);
}

export async function giveGemsToAll(req: AdminRequest, res: Response) {
  const body = req.body as Record<string, unknown>;
  const result = await sendBulkRewards({
    ...body,
    coins: 0,
    gems: body.amount,
    target: { type: body.onlyFree ? 'free' : body.onlyPremium ? 'premium' : 'all' },
  });
  res.status(result.status).json(result.body);
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
  const { title, message, type = 'info', durationMs } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const target = normalizeAdminTarget(req.body as Record<string, unknown>);
  const where = buildUserTargetWhere(target);

  const normalizedDurationMs = parseBroadcastDuration(durationMs);
  const expiresAtIso = new Date(Date.now() + normalizedDurationMs).toISOString();

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  if (users.length === 0) {
    return res.status(200).json({
      message: 'No users matched target filter',
      total: 0,
      deliveredRealtime: 0,
      persisted: 0,
    });
  }

  const payloadData = {
    source: 'admin_broadcast',
    displayType: String(type),
    durationMs: normalizedDurationMs,
    expiresAt: expiresAtIso,
    target,
    sentAt: new Date().toISOString(),
  };

  const batchSize = 500;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await prisma.notification.createMany({
      data: batch.map((user) => ({
        userId: user.id,
        type: 'SYSTEM',
        title: String(title),
        message: String(message),
        data: payloadData,
      })),
    });
  }

  // Emit to all connected authenticated sockets via Socket.IO
  const socketPayload = {
    type: String(type),
    title: String(title),
    message: String(message),
    durationMs: normalizedDurationMs,
    data: payloadData,
    timestamp: new Date().toISOString(),
  };

  let deliveredRealtime = 0;
  for (const user of users) {
    const userRoom = `user:${user.id}`;
    const onlineSocketsInRoom = io.sockets.adapter.rooms.get(userRoom)?.size || 0;
    if (onlineSocketsInRoom === 0) continue;
    deliveredRealtime += onlineSocketsInRoom;
    io.to(userRoom).emit('notification:new', socketPayload);
  }

  res.json({
    message: 'Broadcast sent',
    total: users.length,
    deliveredRealtime,
    persisted: users.length,
    durationMs: normalizedDurationMs,
    targetFilter: target.type,
    target,
  });
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
