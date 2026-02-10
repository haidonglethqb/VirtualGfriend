import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { MemoryType } from '@prisma/client';

interface CreateMemoryData {
  title: string;
  description?: string;
  imageUrl?: string;
  type: MemoryType;
  milestone?: string;
  metadata?: Record<string, unknown>;
}

export const memoryService = {
  async getMemories(userId: string, page: number, limit: number, type?: string) {
    const safeLimit = Math.min(Math.max(1, limit), 100); // Cap at 100
    const skip = (page - 1) * safeLimit;

    const where = {
      userId,
      ...(type && { type: type as MemoryType }),
    };

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      prisma.memory.count({ where }),
    ]);

    return {
      items: memories,
      total,
      page,
      pageSize: safeLimit,
      hasMore: skip + memories.length < total,
    };
  },

  async getMilestones(userId: string) {
    return prisma.memory.findMany({
      where: {
        userId,
        type: 'MILESTONE',
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async createMemory(userId: string, data: CreateMemoryData) {
    return prisma.memory.create({
      data: {
        userId,
        ...data,
        metadata: (data.metadata || undefined) as object | undefined,
      },
    });
  },

  async toggleFavorite(userId: string, memoryId: string) {
    const memory = await prisma.memory.findFirst({
      where: { id: memoryId, userId },
    });

    if (!memory) {
      throw new AppError('Memory not found', 404, 'MEMORY_NOT_FOUND');
    }

    return prisma.memory.update({
      where: { id: memoryId },
      data: { isFavorite: !memory.isFavorite },
    });
  },

  async deleteMemory(userId: string, memoryId: string) {
    const memory = await prisma.memory.findFirst({
      where: { id: memoryId, userId },
    });

    if (!memory) {
      throw new AppError('Memory not found', 404, 'MEMORY_NOT_FOUND');
    }

    await prisma.memory.delete({ where: { id: memoryId } });
  },

  async createMilestone(userId: string, milestone: string, title: string, description?: string) {
    return prisma.memory.create({
      data: {
        userId,
        title,
        description,
        type: 'MILESTONE',
        milestone,
      },
    });
  },
};
