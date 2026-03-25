import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { AdminRequest, verifyAdminPassword, generateAdminToken, isAdminUsername, isAdminConfigured } from './admin.middleware';
import { io } from '../../index';
import { templateService } from '../character/template.service';

const MIN_BROADCAST_DURATION_MS = 1000;
const MAX_BROADCAST_DURATION_MS = 60000;
const DEFAULT_BROADCAST_DURATION_MS = 5000;
const TEMPLATE_GENDERS = ['FEMALE', 'MALE', 'NON_BINARY', 'OTHER'] as const;
type TemplateGender = (typeof TEMPLATE_GENDERS)[number];
const VALID_TEMPLATE_GENDERS = new Set<TemplateGender>(TEMPLATE_GENDERS);

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

type AnalyticsGroupBy = 'day' | 'week' | 'month';
type AnalyticsUserSegment = 'all' | 'new' | 'returning';
type AnalyticsMessageRole = 'ALL' | 'USER' | 'AI' | 'SYSTEM';
type AnalyticsVerifiedFilter = 'all' | 'verified' | 'unverified';
type TopUsersSortBy = 'messages' | 'coins' | 'gems' | 'streak' | 'lastActiveAt';

const ANALYTICS_GROUP_BY_VALUES: AnalyticsGroupBy[] = ['day', 'week', 'month'];
const ANALYTICS_USER_SEGMENTS: AnalyticsUserSegment[] = ['all', 'new', 'returning'];
const ANALYTICS_MESSAGE_ROLES: AnalyticsMessageRole[] = ['ALL', 'USER', 'AI', 'SYSTEM'];
const ANALYTICS_VERIFIED_FILTERS: AnalyticsVerifiedFilter[] = ['all', 'verified', 'unverified'];
const TOP_USERS_SORT_VALUES: TopUsersSortBy[] = ['messages', 'coins', 'gems', 'streak', 'lastActiveAt'];
const PREMIUM_TIERS = ['FREE', 'BASIC', 'PRO', 'ULTIMATE'] as const;

function parseIntInRange(value: unknown, defaultValue: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

function parseDateSafe(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toStartOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function toEndOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function parseEnumValue<T extends readonly string[]>(value: unknown, valid: T, fallback: T[number]): T[number] {
  const normalized = String(value ?? '').trim();
  if ((valid as readonly string[]).includes(normalized)) {
    return normalized as T[number];
  }
  return fallback;
}

function getBucketExpression(groupBy: AnalyticsGroupBy, columnSql: Prisma.Sql): Prisma.Sql {
  if (groupBy === 'week') return Prisma.sql`TO_CHAR(DATE_TRUNC('week', ${columnSql} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;
  if (groupBy === 'month') return Prisma.sql`TO_CHAR(DATE_TRUNC('month', ${columnSql} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;
  return Prisma.sql`TO_CHAR(DATE_TRUNC('day', ${columnSql} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;
}

function buildDateBuckets(startDate: Date, endDate: Date, groupBy: AnalyticsGroupBy): string[] {
  const buckets: string[] = [];
  const current = new Date(startDate);

  if (groupBy === 'month') {
    current.setUTCDate(1);
  }

  if (groupBy === 'week') {
    const day = current.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    current.setUTCDate(current.getUTCDate() - diffToMonday);
  }

  while (current <= endDate) {
    buckets.push(current.toISOString().split('T')[0]);
    if (groupBy === 'month') {
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else if (groupBy === 'week') {
      current.setUTCDate(current.getUTCDate() + 7);
    } else {
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return buckets;
}

function buildUserFilterConditions(
  query: Request['query'],
  startDate: Date,
  includeCreatedAtUpperBound: boolean,
): {
  conditions: Prisma.Sql[];
  premiumTier: string;
  userSegment: AnalyticsUserSegment;
  verified: AnalyticsVerifiedFilter;
} {
  const premiumTier = parseEnumValue(query.premiumTier, [...PREMIUM_TIERS, 'ALL'] as const, 'ALL');
  const userSegment = parseEnumValue(query.userSegment, ANALYTICS_USER_SEGMENTS, 'all');
  const verified = parseEnumValue(query.verified, ANALYTICS_VERIFIED_FILTERS, 'all');
  const endDate = parseDateSafe(query.to);

  const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

  if (premiumTier !== 'ALL') {
    conditions.push(Prisma.sql`u."premiumTier" = CAST(${premiumTier} AS "PremiumTier")`);
  }

  if (userSegment === 'new') {
    conditions.push(Prisma.sql`u."createdAt" >= ${startDate}`);
  }
  if (userSegment === 'returning') {
    conditions.push(Prisma.sql`u."createdAt" < ${startDate}`);
  }

  if (verified === 'verified') {
    conditions.push(Prisma.sql`u."isEmailVerified" = true`);
  }
  if (verified === 'unverified') {
    conditions.push(Prisma.sql`u."isEmailVerified" = false`);
  }

  if (includeCreatedAtUpperBound && endDate) {
    conditions.push(Prisma.sql`u."createdAt" <= ${toEndOfUTCDay(endDate)}`);
  }

  return { conditions, premiumTier, userSegment, verified };
}

function buildUserRealtimeConditions(query: Request['query']): {
  conditions: Prisma.Sql[];
  premiumTier: string;
  verified: AnalyticsVerifiedFilter;
} {
  const premiumTier = parseEnumValue(query.premiumTier, [...PREMIUM_TIERS, 'ALL'] as const, 'ALL');
  const verified = parseEnumValue(query.verified, ANALYTICS_VERIFIED_FILTERS, 'all');
  const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

  if (premiumTier !== 'ALL') {
    conditions.push(Prisma.sql`u."premiumTier" = CAST(${premiumTier} AS "PremiumTier")`);
  }
  if (verified === 'verified') {
    conditions.push(Prisma.sql`u."isEmailVerified" = true`);
  }
  if (verified === 'unverified') {
    conditions.push(Prisma.sql`u."isEmailVerified" = false`);
  }

  return { conditions, premiumTier, verified };
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
    const daysNum = parseIntInRange(req.query.days, 7, 1, 365);
    const fromQuery = parseDateSafe(req.query.from);
    const toQuery = parseDateSafe(req.query.to);
    const groupBy = parseEnumValue(req.query.groupBy, ANALYTICS_GROUP_BY_VALUES, 'day');
    const messageRole = parseEnumValue(req.query.messageRole, ANALYTICS_MESSAGE_ROLES, 'ALL');
    const topLimit = parseIntInRange(req.query.topLimit, 10, 1, 100);
    const minMessageCount = parseIntInRange(req.query.minMessageCount, 0, 0, 1000000);
    const sortBy = parseEnumValue(req.query.sortBy, TOP_USERS_SORT_VALUES, 'messages');

    const endDate = toEndOfUTCDay(toQuery || new Date());
    const startDate = toStartOfUTCDay(fromQuery || new Date(endDate.getTime() - (daysNum - 1) * 24 * 60 * 60 * 1000));
    const bucketExpression = getBucketExpression(groupBy, Prisma.sql`m."createdAt"`);
    const userBucketExpression = getBucketExpression(groupBy, Prisma.sql`u."createdAt"`);

    const { conditions: userConditions, premiumTier, userSegment, verified } = buildUserFilterConditions(req.query, startDate, true);
    const { conditions: realtimeUserConditions } = buildUserRealtimeConditions(req.query);
    const messageConditions: Prisma.Sql[] = [
      Prisma.sql`m."createdAt" >= ${startDate}`,
      Prisma.sql`m."createdAt" <= ${endDate}`,
      ...userConditions,
    ];
    if (messageRole !== 'ALL') {
      messageConditions.push(Prisma.sql`m."role" = CAST(${messageRole} AS "MessageRole")`);
    }

    const topUsersOrderBy =
      sortBy === 'coins'
        ? Prisma.sql`u."coins" DESC, message_count DESC`
        : sortBy === 'gems'
          ? Prisma.sql`u."gems" DESC, message_count DESC`
          : sortBy === 'streak'
            ? Prisma.sql`u."streak" DESC, message_count DESC`
            : sortBy === 'lastActiveAt'
              ? Prisma.sql`u."lastActiveAt" DESC NULLS LAST, message_count DESC`
              : Prisma.sql`message_count DESC, u."lastActiveAt" DESC NULLS LAST`;

    const includeReturningUsers = userSegment !== 'new';

    const [
      usersByBucket,
      messagesByBucket,
      activeUsersByBucket,
      topUsers,
      premiumDistribution,
      totals,
      returningUsers,
      churnRiskUsers,
      activeNow,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ bucket: string; count: bigint }>>`
        SELECT ${userBucketExpression} AS bucket, COUNT(*)::bigint AS count
        FROM "users" u
        WHERE u."createdAt" >= ${startDate}
          AND u."createdAt" <= ${endDate}
          AND ${Prisma.join(userConditions, ' AND ')}
        GROUP BY bucket
        ORDER BY bucket
      `,
      prisma.$queryRaw<Array<{ bucket: string; count: bigint }>>`
        SELECT ${bucketExpression} AS bucket, COUNT(*)::bigint AS count
        FROM "messages" m
        INNER JOIN "users" u ON u.id = m."userId"
        WHERE ${Prisma.join(messageConditions, ' AND ')}
        GROUP BY bucket
        ORDER BY bucket
      `,
      prisma.$queryRaw<Array<{ bucket: string; count: bigint }>>`
        SELECT ${bucketExpression} AS bucket, COUNT(DISTINCT m."userId")::bigint AS count
        FROM "messages" m
        INNER JOIN "users" u ON u.id = m."userId"
        WHERE ${Prisma.join(messageConditions, ' AND ')}
        GROUP BY bucket
        ORDER BY bucket
      `,
      prisma.$queryRaw<Array<{
        id: string;
        username: string | null;
        displayName: string | null;
        email: string;
        coins: number;
        gems: number;
        streak: number;
        premiumTier: string;
        isEmailVerified: boolean;
        lastActiveAt: Date | null;
        message_count: bigint;
        last_message_at: Date | null;
      }>>`
        SELECT
          u.id,
          u.username,
          u."displayName",
          u.email,
          u.coins,
          u.gems,
          u.streak,
          u."premiumTier",
          u."isEmailVerified",
          u."lastActiveAt",
          COUNT(m.id)::bigint AS message_count,
          MAX(m."createdAt") AS last_message_at
        FROM "users" u
        LEFT JOIN "messages" m
          ON m."userId" = u.id
          AND m."createdAt" >= ${startDate}
          AND m."createdAt" <= ${endDate}
          ${messageRole !== 'ALL' ? Prisma.sql`AND m."role" = CAST(${messageRole} AS "MessageRole")` : Prisma.sql``}
        WHERE ${Prisma.join(userConditions, ' AND ')}
        GROUP BY u.id
        HAVING COUNT(m.id) >= ${minMessageCount}
        ORDER BY ${topUsersOrderBy}
        LIMIT ${topLimit}
      `,
      prisma.$queryRaw<Array<{ premiumTier: string; count: bigint }>>`
        SELECT u."premiumTier", COUNT(*)::bigint AS count
        FROM "users" u
        WHERE ${Prisma.join(userConditions, ' AND ')}
        GROUP BY u."premiumTier"
        ORDER BY u."premiumTier"
      `,
      prisma.$queryRaw<Array<{ total_users: bigint; new_users: bigint; total_messages: bigint; active_users: bigint; premium_users: bigint }>>`
        SELECT
          COUNT(DISTINCT u.id)::bigint AS total_users,
          COUNT(DISTINCT CASE WHEN u."createdAt" >= ${startDate} AND u."createdAt" <= ${endDate} THEN u.id END)::bigint AS new_users,
          COUNT(m.id)::bigint AS total_messages,
          COUNT(DISTINCT m."userId")::bigint AS active_users,
          COUNT(DISTINCT CASE WHEN u."premiumTier" != 'FREE' THEN u.id END)::bigint AS premium_users
        FROM "users" u
        LEFT JOIN "messages" m ON m."userId" = u.id
          AND m."createdAt" >= ${startDate}
          AND m."createdAt" <= ${endDate}
          ${messageRole !== 'ALL' ? Prisma.sql`AND m."role" = CAST(${messageRole} AS "MessageRole")` : Prisma.sql``}
        WHERE ${Prisma.join(userConditions, ' AND ')}
      `,
      includeReturningUsers
        ? prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT m."userId")::bigint AS count
          FROM "messages" m
          INNER JOIN "users" u ON u.id = m."userId"
          WHERE m."createdAt" >= ${startDate}
            AND m."createdAt" <= ${endDate}
            AND u."createdAt" < ${startDate}
            ${messageRole !== 'ALL' ? Prisma.sql`AND m."role" = CAST(${messageRole} AS "MessageRole")` : Prisma.sql``}
            AND ${Prisma.join(realtimeUserConditions, ' AND ')}
        `
          : Promise.resolve([{ count: 0 as unknown as bigint }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "users" u
        WHERE u."lastActiveAt" >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND u."lastActiveAt" < ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
          AND ${Prisma.join(realtimeUserConditions, ' AND ')}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "users" u
        WHERE u."lastActiveAt" >= ${new Date(Date.now() - 15 * 60 * 1000)}
          AND ${Prisma.join(realtimeUserConditions, ' AND ')}
      `,
    ]);

    const allBuckets = buildDateBuckets(startDate, endDate, groupBy);
    const userMap = new Map(usersByBucket.map((row) => [row.bucket, Number(row.count)]));
    const messageMap = new Map(messagesByBucket.map((row) => [row.bucket, Number(row.count)]));
    const activeUserMap = new Map(activeUsersByBucket.map((row) => [row.bucket, Number(row.count)]));

    const dailyStats = allBuckets.map((date) => ({
      date,
      new_users: userMap.get(date) || 0,
      messages: messageMap.get(date) || 0,
      active_users: activeUserMap.get(date) || 0,
    }));

    const messageStats = allBuckets.map((date) => ({
      date,
      count: messageMap.get(date) || 0,
    }));

    const summaryRow = totals[0];
    const totalUsers = Number(summaryRow?.total_users || 0);
    const totalMessages = Number(summaryRow?.total_messages || 0);
    const activeUsers = Number(summaryRow?.active_users || 0);
    const premiumUsers = Number(summaryRow?.premium_users || 0);

    res.json({
      dailyStats,
      messageStats,
      topUsers: topUsers.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        coins: user.coins,
        gems: user.gems,
        streak: user.streak,
        premiumTier: user.premiumTier,
        isEmailVerified: user.isEmailVerified,
        lastActiveAt: user.lastActiveAt,
        lastMessageAt: user.last_message_at,
        messageCount: Number(user.message_count || 0),
      })),
      premiumDistribution: premiumDistribution.map((item) => ({
        premiumTier: item.premiumTier,
        _count: Number(item.count || 0),
      })),
      summary: {
        totalUsers,
        newUsers: Number(summaryRow?.new_users || 0),
        activeUsers,
        totalMessages,
        premiumUsers,
        premiumRate: totalUsers > 0 ? Number(((premiumUsers / totalUsers) * 100).toFixed(2)) : 0,
        avgMessagesPerActiveUser: activeUsers > 0 ? Number((totalMessages / activeUsers).toFixed(2)) : 0,
        returningUsers: Number(returningUsers[0]?.count || 0),
        churnRiskUsers: Number(churnRiskUsers[0]?.count || 0),
        activeNow: Number(activeNow[0]?.count || 0),
      },
      realtimeSummary: {
        churnRiskWindowDays: { min: 7, max: 30 },
        activeNowWindowMinutes: 15,
        churnRiskUsers: Number(churnRiskUsers[0]?.count || 0),
        activeNow: Number(activeNow[0]?.count || 0),
      },
      filtersApplied: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        groupBy,
        premiumTier,
        userSegment,
        verified,
        messageRole,
        topLimit,
        minMessageCount,
        sortBy,
      },
    });
  } catch (error) {
    console.error('[Admin] Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// ============== SYSTEM ==============
export async function getSystemInfo(req: AdminRequest, res: Response) {
  try {
    const windowMinutes = parseIntInRange(req.query.windowMinutes, 60, 5, 24 * 60);
    const tableLimit = parseIntInRange(req.query.tableLimit, 20, 5, 100);
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const [
      dbSizeResult,
      tableStatsResult,
      connectionsResult,
      dbStatsResult,
      activityStatsResult,
      requestStatsResult,
      errorStatsResult,
    ] = await Promise.allSettled([
      prisma.$queryRaw<Array<{ size: string; bytes: bigint }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database())::bigint as bytes
      `,
      prisma.$queryRaw<Array<{ table_name: string; row_count: bigint; seq_scan: bigint; idx_scan: bigint; dead_rows: bigint }>>`
        SELECT 
          relname as table_name,
          n_live_tup as row_count,
          seq_scan,
          idx_scan,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT ${tableLimit}
      `,
      prisma.$queryRaw<Array<{ total: bigint; active: bigint; idle: bigint }>>`
        SELECT
          COUNT(*)::bigint as total,
          COUNT(*) FILTER (WHERE state = 'active')::bigint as active,
          COUNT(*) FILTER (WHERE state = 'idle')::bigint as idle
        FROM pg_stat_activity
        WHERE datname = current_database()
      `,
      prisma.$queryRaw<Array<{ commits: bigint; rollbacks: bigint; blks_hit: bigint; blks_read: bigint }>>`
        SELECT
          xact_commit::bigint as commits,
          xact_rollback::bigint as rollbacks,
          blks_hit::bigint as blks_hit,
          blks_read::bigint as blks_read
        FROM pg_stat_database
        WHERE datname = current_database()
      `,
      prisma.$queryRaw<Array<{ messages: bigint; new_users: bigint; notifications: bigint; active_users: bigint; monitoring_events: bigint }>>`
        SELECT
          (SELECT COUNT(*)::bigint FROM "messages" WHERE "createdAt" >= ${windowStart}) as messages,
          (SELECT COUNT(*)::bigint FROM "users" WHERE "createdAt" >= ${windowStart}) as new_users,
          (SELECT COUNT(*)::bigint FROM "notifications" WHERE "createdAt" >= ${windowStart}) as notifications,
          (SELECT COUNT(*)::bigint FROM "users" WHERE "lastActiveAt" >= ${windowStart}) as active_users,
          (SELECT COUNT(*)::bigint FROM "monitoring_events" WHERE "createdAt" >= ${windowStart}) as monitoring_events
      `,
      prisma.$queryRaw<Array<{ path: string | null; method: string | null; requests: bigint; avg_duration: number | null; p95_duration: number | null }>>`
        SELECT
          path,
          method,
          COUNT(*)::bigint as requests,
          AVG("durationMs")::float as avg_duration,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs")::float as p95_duration
        FROM "monitoring_events"
        WHERE "createdAt" >= ${windowStart}
          AND "eventType" = 'REQUEST'
        GROUP BY path, method
        ORDER BY requests DESC
        LIMIT 20
      `,
      prisma.$queryRaw<Array<{ severity: string; count: bigint }>>`
        SELECT
          severity,
          COUNT(*)::bigint as count
        FROM "monitoring_events"
        WHERE "createdAt" >= ${windowStart}
          AND (
            "eventType" = 'ERROR'
            OR severity IN ('error', 'critical')
            OR ("statusCode" IS NOT NULL AND "statusCode" >= 500)
          )
        GROUP BY severity
        ORDER BY count DESC
      `,
    ]);

    const dbSize = dbSizeResult.status === 'fulfilled' ? dbSizeResult.value : [];
    const tableStats = tableStatsResult.status === 'fulfilled' ? tableStatsResult.value : [];
    const connections = connectionsResult.status === 'fulfilled' ? connectionsResult.value : [];
    const dbStats = dbStatsResult.status === 'fulfilled' ? dbStatsResult.value : [];
    const activityStats = activityStatsResult.status === 'fulfilled' ? activityStatsResult.value : [];
    const requestStats = requestStatsResult.status === 'fulfilled' ? requestStatsResult.value : [];
    const errorStats = errorStatsResult.status === 'fulfilled' ? errorStatsResult.value : [];

    const dbStat = dbStats[0];
    const totalBlocks = Number(dbStat?.blks_hit || 0) + Number(dbStat?.blks_read || 0);
    const cacheHitRate = totalBlocks > 0 ? Number(((Number(dbStat?.blks_hit || 0) / totalBlocks) * 100).toFixed(2)) : 0;
    const conn = connections[0];
    const activity = activityStats[0];

    res.json({
      databaseSize: dbSize[0]?.size || 'Unknown',
      databaseSizeBytes: Number(dbSize[0]?.bytes || 0),
      tables: tableStats.map(t => ({
        name: t.table_name,
        rows: Number(t.row_count),
        seqScan: Number(t.seq_scan),
        idxScan: Number(t.idx_scan),
        deadRows: Number(t.dead_rows),
      })),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      filtersApplied: {
        windowMinutes,
        tableLimit,
        from: windowStart.toISOString(),
        to: new Date().toISOString(),
      },
      connections: {
        total: Number(conn?.total || 0),
        active: Number(conn?.active || 0),
        idle: Number(conn?.idle || 0),
      },
      dbPerformance: {
        commits: Number(dbStat?.commits || 0),
        rollbacks: Number(dbStat?.rollbacks || 0),
        cacheHitRate,
      },
      realtimeActivity: {
        messages: Number(activity?.messages || 0),
        newUsers: Number(activity?.new_users || 0),
        notifications: Number(activity?.notifications || 0),
        activeUsers: Number(activity?.active_users || 0),
        monitoringEvents: Number(activity?.monitoring_events || 0),
      },
      requestStats: requestStats.map((row) => ({
        path: row.path || 'unknown',
        method: row.method || 'unknown',
        requests: Number(row.requests || 0),
        avgDurationMs: row.avg_duration ? Number(row.avg_duration.toFixed(2)) : 0,
        p95DurationMs: row.p95_duration ? Number(row.p95_duration.toFixed(2)) : 0,
      })),
      errorStats: errorStats.map((row) => ({
        severity: row.severity,
        count: Number(row.count || 0),
      })),
    });
  } catch (error) {
    console.error('[Admin] System monitor error:', error);
    res.status(500).json({ error: 'Failed to fetch system monitor data' });
  }
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
  const { title, message, type = 'info', durationMs, targetFilter = 'all' } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const normalizedTarget = ['all', 'free', 'premium'].includes(String(targetFilter))
    ? String(targetFilter)
    : 'all';

  const where: Record<string, unknown> = {};
  if (normalizedTarget === 'free') where.isPremium = false;
  if (normalizedTarget === 'premium') where.isPremium = true;

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
    target: normalizedTarget,
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
    targetFilter: normalizedTarget,
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
