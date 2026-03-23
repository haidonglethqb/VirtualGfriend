import { prisma } from '../../lib/prisma';
import { cache, CacheTTL } from '../../lib/redis';

const TEMPLATES_CACHE_KEY = 'character_templates:all';

export const templateService = {
  async getAll() {
    // Try cache first
    const cached = await cache.get<any[]>(TEMPLATES_CACHE_KEY);
    if (cached) return cached;

    const templates = await prisma.characterTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Cache for 1 hour
    await cache.set(TEMPLATES_CACHE_KEY, templates, CacheTTL.CHARACTER);

    return templates;
  },

  async getById(id: string) {
    const template = await prisma.characterTemplate.findUnique({
      where: { id },
    });

    return template;
  },

  async invalidateCache() {
    await cache.del(TEMPLATES_CACHE_KEY);
  },
};
