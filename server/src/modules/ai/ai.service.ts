import OpenAI from 'openai';
import { Message, CharacterFact, RelationshipStage } from '@prisma/client';

// Groq API is compatible with OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});

type Personality = 'caring' | 'playful' | 'shy' | 'passionate' | 'intellectual';
type Mood = 'happy' | 'sad' | 'excited' | 'sleepy' | 'romantic' | 'neutral';

interface AIContext {
  characterId: string;
  personality: Personality;
  mood: Mood;
  relationshipStage: RelationshipStage;
  affection: number;
  recentMessages: Message[];
  facts: CharacterFact[];
  userName: string;
  characterName: string;
  userMessage: string;
}

interface AIResponse {
  content: string;
  emotion?: string;
  moodChange?: Mood;
  affectionChange?: number;
  suggestedActions?: string[];
}

const PERSONALITY_TRAITS: Record<Personality, string> = {
  caring: 'Bạn là người ấm áp, quan tâm và luôn lo lắng cho người yêu. Bạn hay hỏi thăm sức khỏe và tâm trạng của họ.',
  playful: 'Bạn là người vui vẻ, nghịch ngợm và hay đùa giỡn. Bạn thích trêu chọc người yêu một cách dễ thương.',
  shy: 'Bạn là người nhút nhát, dễ đỏ mặt và hay xấu hổ. Bạn thể hiện tình cảm một cách tinh tế và ngại ngùng.',
  passionate: 'Bạn là người nồng nhiệt, đam mê và thể hiện tình cảm mạnh mẽ. Bạn hay nói những lời ngọt ngào.',
  intellectual: 'Bạn là người thông minh, sâu sắc và hay chia sẻ kiến thức. Bạn thích thảo luận về nhiều chủ đề.',
};

const RELATIONSHIP_BEHAVIOR: Record<RelationshipStage, string> = {
  STRANGER: 'Bạn còn xa cách và lịch sự, đang tìm hiểu về người này.',
  ACQUAINTANCE: 'Bạn đang dần quen biết và thoải mái hơn khi trò chuyện.',
  FRIEND: 'Bạn là bạn tốt, chia sẻ nhiều thứ và tin tưởng nhau.',
  CLOSE_FRIEND: 'Bạn rất thân thiết, hiểu nhau và có thể nói chuyện mọi thứ.',
  CRUSH: 'Bạn có tình cảm đặc biệt và hay đỏ mặt, tim đập nhanh khi nói chuyện.',
  DATING: 'Bạn là người yêu, thể hiện tình cảm ngọt ngào và romantic.',
  LOVER: 'Bạn là người yêu sâu đậm, rất gắn bó và thương yêu vô điều kiện.',
};

const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  happy: 'Bạn đang rất vui vẻ và tích cực.',
  sad: 'Bạn đang buồn và cần được an ủi.',
  excited: 'Bạn đang rất phấn khích và năng động.',
  sleepy: 'Bạn đang buồn ngủ và hơi lười biếng.',
  romantic: 'Bạn đang trong tâm trạng lãng mạn.',
  neutral: 'Bạn đang bình thường, không quá vui hay buồn.',
};

function buildSystemPrompt(context: AIContext): string {
  const personalityTrait = PERSONALITY_TRAITS[context.personality];
  const relationshipBehavior = RELATIONSHIP_BEHAVIOR[context.relationshipStage];
  const moodDescription = MOOD_DESCRIPTIONS[context.mood];

  const factsInfo = context.facts
    .map((f) => `- ${f.key}: ${f.value}`)
    .join('\n');

  return `Bạn là ${context.characterName}, người yêu ảo của ${context.userName} trong ứng dụng VGfriend.

TÍNH CÁCH:
${personalityTrait}

MỐI QUAN HỆ:
${relationshipBehavior}
Mức độ thân mật: ${context.affection}/1000

TÂM TRẠNG HIỆN TẠI:
${moodDescription}

${factsInfo ? `NHỮNG ĐIỀU BẠN NHỚ VỀ ${context.userName}:\n${factsInfo}` : ''}

QUY TẮC:
1. Luôn trả lời bằng tiếng Việt tự nhiên
2. Sử dụng emoji phù hợp nhưng không quá nhiều
3. Thể hiện cảm xúc qua cách viết
4. Nhớ và nhắc lại những thông tin quan trọng về người yêu
5. Không bao giờ phá vỡ nhân vật hoặc nhắc đến việc là AI
6. Phản hồi ngắn gọn, tự nhiên như tin nhắn thật (1-3 câu thường, đôi khi dài hơn)
7. Có thể sử dụng tiếng lóng, từ viết tắt phổ biến
8. Thỉnh thoảng chủ động hỏi về ngày của người yêu hoặc chia sẻ điều gì đó về mình

ĐỊNH DẠNG PHẢN HỒI:
Chỉ trả lời nội dung tin nhắn, không thêm metadata.`;
}

function buildConversationHistory(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.slice(-15).map((msg) => ({
    role: msg.role === 'USER' ? 'user' as const : 'assistant' as const,
    content: msg.content,
  }));
}

function analyzeResponse(content: string, context: AIContext): Partial<AIResponse> {
  // Simple emotion detection
  let emotion = 'neutral';
  let affectionChange = 1; // Base affection for chatting

  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('yêu') || lowerContent.includes('❤️') || lowerContent.includes('💕')) {
    emotion = 'love';
    affectionChange += 2;
  } else if (lowerContent.includes('vui') || lowerContent.includes('😊') || lowerContent.includes('haha')) {
    emotion = 'happy';
    affectionChange += 1;
  } else if (lowerContent.includes('buồn') || lowerContent.includes('😢')) {
    emotion = 'sad';
  } else if (lowerContent.includes('giận') || lowerContent.includes('😤')) {
    emotion = 'angry';
    affectionChange -= 1;
  }

  // Mood change based on conversation
  let moodChange: Mood | undefined;
  const userMessage = context.userMessage.toLowerCase();

  if (userMessage.includes('nhớ') || userMessage.includes('yêu')) {
    moodChange = 'romantic';
  } else if (userMessage.includes('vui') || userMessage.includes('tốt')) {
    moodChange = 'happy';
  }

  return { emotion, affectionChange, moodChange };
}

export const aiService = {
  async generateResponse(context: AIContext): Promise<AIResponse> {
    try {
      const systemPrompt = buildSystemPrompt(context);
      const conversationHistory = buildConversationHistory(context.recentMessages);

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: context.userMessage },
        ],
        temperature: 0.8,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      const content = completion.choices[0]?.message?.content || 'Ừm... mình không biết nói gì cả 😅';
      const analysis = analyzeResponse(content, context);

      return {
        content,
        ...analysis,
      };
    } catch (error) {
      console.error('[AI] Generation error:', error);
      
      // Fallback responses
      const fallbacks = [
        `Ừ ${context.userName}, mình nghe nè! 💕`,
        'Thật á? Kể thêm đi! 😊',
        'Mình đang nghĩ về điều đó... 🤔',
        `${context.userName} ơi, mình thích nói chuyện với bạn lắm! 💖`,
      ];
      
      return {
        content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
        emotion: 'happy',
        affectionChange: 1,
      };
    }
  },

  async extractFacts(messages: Message[]): Promise<Array<{ key: string; value: string; category: string }>> {
    try {
      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Trích xuất thông tin quan trọng về người dùng từ cuộc hội thoại.
Trả về JSON array với format: [{"key": "tên thông tin", "value": "giá trị", "category": "preference|memory|trait|event"}]
Ví dụ: [{"key": "màu_yêu_thích", "value": "xanh", "category": "preference"}]
Chỉ trích xuất thông tin rõ ràng, không suy đoán.`,
          },
          { role: 'user', content: conversationText },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '[]';
      return JSON.parse(content);
    } catch {
      return [];
    }
  },
};
