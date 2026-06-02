/**
 * Facts Learning Service
 * Automatically extracts and saves facts about users from conversations
 */

import { prisma } from '../../lib/prisma';
import { cache, CacheKeys } from '../../lib/redis';
import { aiService } from '../ai/ai.service';
import { Message } from '@prisma/client';
import { createModuleLogger } from '../../lib/logger';
import {
  factQuotaService,
  normalizeFactCategory,
  normalizeFactKey,
  type FactSaveResult,
} from '../character/fact-quota.service';
import { cleanupLowQualityAiFacts } from './memory-policy.service';

const log = createModuleLogger('FactsLearning');

// How often to trigger fact extraction (every N messages)
const FACT_EXTRACTION_INTERVAL = 10;

// Categories of facts to extract
type FactCategory = 'personal' | 'preference' | 'relationship' | 'work' | 'life' | 'memory' | 'event' | 'other';

interface ExtractedFact {
  key: string;
  value: string;
  category: FactCategory;
  importance?: number;
}

type ExtractFactsResult = ExtractedFact[] & { factUpdates?: FactSaveResult };

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
  ): Promise<ExtractFactsResult> {
    try {
      // Only extract if we have enough context
      if (recentMessages.length < 5) {
        return [];
      }

      log.debug('Extracting facts from ' + recentMessages.length + ' messages');

      // Use AI to extract facts
      const extractedFacts = (await aiService.extractFacts(recentMessages)).slice(0, 7);

      if (!extractedFacts || extractedFacts.length === 0) {
        log.debug('No facts extracted');
        return [];
      }

      log.debug('Extracted ' + extractedFacts.length + ' facts');

      const saveResult = await factQuotaService.saveFactsQuotaAware(
        characterId,
        extractedFacts,
        'ai_batch',
        this.calculateImportance,
      );

      const savedFacts = extractedFacts
        .slice(0, saveResult.added + saveResult.updated)
        .map((fact) => ({
          key: normalizeFactKey(fact.key),
          value: fact.value,
          category: normalizeFactCategory(fact.category) as FactCategory,
          importance: this.calculateImportance(fact.category, fact.value),
        })) as ExtractFactsResult;
      savedFacts.factUpdates = saveResult;

      log.info('Saved ' + savedFacts.length + ' facts');

      // Invalidate character cache after extracting and saving facts
      if (saveResult.added > 0 || saveResult.updated > 0) {
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
      personal: 8,    // Personal info is very important
      relationship: 8,
      work: 7,
      life: 6,
      memory: 6,      // Memories are moderately important
      event: 5,       // Events are less persistent
      other: 5,
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
    const cleaned = await cleanupLowQualityAiFacts();
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
    log.info(`Decayed ${totalDecayed} old facts and cleaned ${cleaned.count} low-quality facts`);
    return totalDecayed + cleaned.count;
  },
};
