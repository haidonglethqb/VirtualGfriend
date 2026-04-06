/**
 * Conversation Summary Service
 * Generates and stores AI summaries of recent conversations for long-term memory context.
 * Triggered every 10 messages (same interval as batch fact extraction).
 */

import OpenAI from 'openai';
import { prisma } from '../../lib/prisma';
import { Message } from '@prisma/client';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('ConversationSummary');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});

export const conversationSummaryService = {
  /**
   * Generate and save a summary of recent messages.
   * Should be called every 10 messages in the background.
   */
  async createSummary(
    userId: string,
    characterId: string,
    recentMessages: Message[]
  ): Promise<void> {
    if (recentMessages.length < 5) return;

    try {
      const conversationText = recentMessages
        .slice(-20)
        .map((m) => `${m.role === 'USER' ? 'Người dùng' : 'Bạn gái AI'}: ${m.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Tóm tắt cuộc trò chuyện giữa người dùng và bạn gái ảo thành JSON.

FORMAT (chỉ trả về JSON, không text thêm):
{
  "summary": "2-3 câu tóm tắt ngắn gọn bằng tiếng Việt, góc nhìn thứ 3",
  "keyTopics": ["chủ đề 1", "chủ đề 2"],
  "emotionalTone": "positive|neutral|negative|romantic|sad|excited"
}

Tóm tắt phải ngắn gọn, giữ lại những điểm quan trọng như: thông tin chia sẻ, cảm xúc nổi bật, chủ đề chính.`,
          },
          { role: 'user', content: conversationText },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content || '';

      let parsed: { summary: string; keyTopics: string[]; emotionalTone: string };
      try {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) return;
        parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      } catch {
        return;
      }

      if (!parsed.summary) return;

      await prisma.conversationSummary.create({
        data: {
          userId,
          characterId,
          summary: parsed.summary,
          keyTopics: parsed.keyTopics || [],
          emotionalTone: parsed.emotionalTone || 'neutral',
          messageCount: recentMessages.length,
        },
      });

      log.info(`Created conversation summary for character ${characterId}`);
    } catch (error) {
      log.error('Error creating conversation summary:', error);
    }
  },

  /**
   * Get the N most recent summaries for a character conversation.
   * Returns summaries in chronological order (oldest first).
   */
  async getRecentSummaries(
    userId: string,
    characterId: string,
    limit: number = 3
  ): Promise<string[]> {
    try {
      const summaries = await prisma.conversationSummary.findMany({
        where: { userId, characterId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { summary: true },
      });
      // Reverse to chronological order (oldest first = context flows naturally)
      return summaries.reverse().map((s) => s.summary);
    } catch {
      return [];
    }
  },
};
