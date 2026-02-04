/**
 * Test Data Generators
 * Utility functions to generate test data
 */

/**
 * Generate unique email for testing
 */
export function generateEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@test.com`;
}

/**
 * Generate unique username
 */
export function generateUsername(prefix = 'user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate random string
 */
export function randomString(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate valid password
 */
export function generatePassword(): string {
  return `Test${randomString(8)}123!`;
}

/**
 * Test user data
 */
export interface TestUser {
  email: string;
  password: string;
  username?: string;
}

/**
 * Generate test user
 */
export function generateTestUser(): TestUser {
  return {
    email: generateEmail(),
    password: generatePassword(),
    username: generateUsername(),
  };
}

/**
 * Test character data
 */
export interface TestCharacter {
  name: string;
  personality: string;
  appearanceData?: {
    hairColor?: string;
    eyeColor?: string;
    skinTone?: string;
  };
}

/**
 * Generate test character
 */
export function generateTestCharacter(): TestCharacter {
  const personalities = ['friendly', 'shy', 'playful', 'romantic', 'caring'];
  const hairColors = ['black', 'brown', 'blonde', 'red', 'pink'];
  const eyeColors = ['brown', 'blue', 'green', 'hazel', 'amber'];

  return {
    name: `TestGF_${randomString(6)}`,
    personality: personalities[Math.floor(Math.random() * personalities.length)],
    appearanceData: {
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
    },
  };
}

/**
 * Test messages
 */
export const testMessages = {
  greetings: [
    'Hello!',
    'Hi there!',
    'Hey, how are you?',
    'Good morning!',
    'Good evening!',
  ],
  questions: [
    'How are you feeling today?',
    'What would you like to do?',
    'Tell me about yourself',
    'What\'s your favorite color?',
    'Do you like music?',
  ],
  casual: [
    'That\'s nice!',
    'I see, interesting',
    'Tell me more',
    'I agree with you',
    'That sounds fun!',
  ],
};

/**
 * Get random message from category
 */
export function getRandomMessage(category: keyof typeof testMessages = 'greetings'): string {
  const messages = testMessages[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate long message for stress testing
 */
export function generateLongMessage(words = 100): string {
  const lorem = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua';
  const loremWords = lorem.split(' ');
  
  let message = '';
  for (let i = 0; i < words; i++) {
    message += loremWords[i % loremWords.length] + ' ';
  }
  return message.trim();
}

/**
 * Default test credentials (from environment or fallback)
 */
export const defaultCredentials = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'Test123456',
};
