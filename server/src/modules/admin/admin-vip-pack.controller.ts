import { Response } from 'express';
import { PremiumTier, Prisma, Rarity } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/redis';
import { AdminRequest } from './admin.middleware';
import { getVipGiftPackConfig, updateVipGiftPackConfig } from '../gift/vip-pack-config.service';

function parseBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function parseTake(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(200, Math.max(1, Math.floor(parsed)));
}

export async function getAdminVipGiftPack(_req: AdminRequest, res: Response) {
  const segments = await getVipGiftPackConfig();
  res.json({ segments });
}

export async function updateAdminVipGiftPack(req: AdminRequest, res: Response) {
  if (!Array.isArray(req.body?.segments)) {
    return res.status(400).json({ error: 'segments must be an array' });
  }

  const segments = await updateVipGiftPackConfig({ segments: req.body.segments });
  await cache.delPattern('vip_pack:*');

  res.json({ message: 'VIP gift pack updated', segments });
}

export async function getAdminGiftCatalog(req: AdminRequest, res: Response) {
  const {
    search,
    category,
    rarity,
    minimumTier,
    requiresPremium,
    isActive,
    take,
  } = req.query;

  const where: Prisma.GiftWhereInput = {};
  const searchText = String(search || '').trim();

  if (searchText) {
    where.OR = [
      { name: { contains: searchText, mode: 'insensitive' } },
      { description: { contains: searchText, mode: 'insensitive' } },
    ];
  }

  if (category) where.category = String(category);
  if (Object.values(Rarity).includes(String(rarity) as Rarity)) where.rarity = String(rarity) as Rarity;
  if (Object.values(PremiumTier).includes(String(minimumTier) as PremiumTier)) {
    where.minimumTier = String(minimumTier) as PremiumTier;
  }

  const premiumFilter = parseBool(requiresPremium);
  if (premiumFilter !== undefined) where.requiresPremium = premiumFilter;

  const activeFilter = parseBool(isActive);
  if (activeFilter !== undefined) where.isActive = activeFilter;

  const [gifts, categories] = await Promise.all([
    prisma.gift.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      take: parseTake(take),
    }),
    prisma.gift.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    }),
  ]);

  res.json({
    gifts,
    categories: categories.map((item) => item.category),
  });
}
