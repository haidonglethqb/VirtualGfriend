/**
 * Facts Learning Service
 * Automatically extracts and saves facts about users from conversations
 */

import { prisma } from '../../lib/prisma';
import { cache, CacheKeys } from '../../lib/redis';
import { aiService } from '../ai/ai.service';
import { Message } from '@prisma/client';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('FactsLearning');

// How often to trigger fact extraction (every N messages)
const FACT_EXTRACTION_INTERVAL = 10;

// Categories of facts to extract
type FactCategory = 'preference' | 'memory' | 'trait' | 'event';

interface ExtractedFact {
  key: string;
  value: string;
  category: FactCategory;
  importance?: number;
}

export const factsLearningService = {
  /**
   * Check if we should extract facts (every N messages)
   */
  shouldExtractFacts(messageCount: number): boolean {
    return messageCount > 0 && messageCount % FACT_EXTRACTION_INTERVAL === 0;
  },

  /**
   * Extract facts from recent messages and save them
   */
  async extractAndSaveFacts(
    characterId: string,
    recentMessages: Message[]
  ): Promise<ExtractedFact[]> {
    try {
      // Only extract if we have enough context
      if (recentMessages.length < 5) {
        return [];
      }

      log.debug('Extracting facts from ' + recentMessages.length + ' messages');

      // Use AI to extract facts
      const extractedFacts = await aiService.extractFacts(recentMessages);

      if (!extractedFacts || extractedFacts.length === 0) {
        log.debug('No facts extracted');
        return [];
      }

      log.debug('Extracted ' + extractedFacts.length + ' facts');

      // Save facts to database
      const savedFacts: ExtractedFact[] = [];

      for (const fact of extractedFacts) {
        try {
          // Normalize key to snake_case
          const normalizedKey = fact.key
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

          // Determine importance based on category
          const importance = this.calculateImportance(fact.category, fact.value);

          // Upsert the fact
          await prisma.characterFact.upsert({
            where: {
              characterId_key: {
                characterId,
                key: normalizedKey,
              },
            },
            update: {
              value: fact.value,
              category: fact.category,
              importance,
              updatedAt: new Date(),
            },
            create: {
              characterId,
              key: normalizedKey,
              value: fact.value,
              category: fact.category,
              importance,
              sourceType: 'ai_batch',
              learnedAt: new Date(),
            },
          });

          savedFacts.push({
            key: normalizedKey,
            value: fact.value,
            category: fact.category as FactCategory,
            importance,
          });
        } catch (error) {
          log.error('Error saving fact:', { fact, error });
        }
      }

      log.info('Saved ' + savedFacts.length + ' facts');

      // Invalidate character cache after extracting and saving facts
      if (savedFacts.length > 0) {
        await cache.del(CacheKeys.characterWithFacts(characterId));
      }

      return savedFacts;
    } catch (error) {
      log.error('Error extracting facts:', error);
      return [];
    }
  },

  /**
   * Calculate importance score based on fact category and value
   */
  calculateImportance(category: string, value: string): number {
    // Base importance by category
    const categoryScores: Record<string, number> = {
      preference: 7,  // User preferences are important
      trait: 8,       // Personality traits are very important
      memory: 6,      // Memories are moderately important
      event: 5,       // Events are less persistent
    };

    let importance = categoryScores[category] || 5;

    // Boost importance for longer, more detailed values
    if (value.length > 50) importance += 1;
    if (value.length > 100) importance += 1;

    // Cap at 10
    return Math.min(10, importance);
  },

  /**
   * Get all facts for a character
   */
  async getFacts(characterId: string): Promise<ExtractedFact[]> {
    const facts = await prisma.characterFact.findMany({
      where: { characterId },
      orderBy: { importance: 'desc' },
    });

    return facts.map(f => ({
      key: f.key,
      value: f.value,
      category: f.category as FactCategory,
      importance: f.importance,
    }));
  },

  /**
   * Delete a fact
   */
  async deleteFact(characterId: string, key: string): Promise<void> {
    await prisma.characterFact.delete({
      where: {
        characterId_key: {
          characterId,
          key,
        },
      },
    });
  },

  /**
   * Decay old facts (reduce importance over time).
   * Rules:
   *   - trait, preference, personal_info, hobby → NEVER decay (permanent)
   *   - memory → decay after 60 days
   *   - event → decay after 30 days (default)
   */
  async decayOldFacts(daysOld: number = 30): Promise<number> {
    let totalDecayed = 0;

    // Decay event facts quickly (after daysOld days, default 30)
    const eventCutoff = new Date();
    eventCutoff.setDate(eventCutoff.getDate() - daysOld);
    const eventResult = await prisma.characterFact.updateMany({
      where: {
        updatedAt: { lt: eventCutoff },
        importance: { gt: 1 },
        category: 'event',
      },
      data: { importance: { decrement: 1 } },
    });
    totalDecayed += eventResult.count;

    // Decay memory facts slower (after 60 days)
    const memoryCutoff = new Date();
    memoryCutoff.setDate(memoryCutoff.getDate() - daysOld * 2);
    const memoryResult = await prisma.characterFact.updateMany({
      where: {
        updatedAt: { lt: memoryCutoff },
        importance: { gt: 1 },
        category: 'memory',
      },
      data: { importance: { decrement: 1 } },
    });
    totalDecayed += memoryResult.count;

    // trait, preference, personal_info, hobby, emotional → never decay (permanent/evolving)
    log.info(`Decayed ${totalDecayed} old facts (event: ${eventResult.count}, memory: ${memoryResult.count})`);
    return totalDecayed;
  },
};
