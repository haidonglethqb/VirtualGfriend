import { test, expect } from '../fixtures';

test.describe('Chat API @api', () => {
  // Run tests serially to avoid rate limiting
  test.describe.configure({ mode: 'serial' });
  const timestamp = Date.now();

  test.describe('POST /api/chat/send', () => {
    test('should send message and get response', async ({ apiClient }) => {
      // Setup: register, login, create character
      const email = `chat_send_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      await apiClient.createCharacter({ name: `ChatChar_${timestamp}` });
      
      const { response, data } = await apiClient.sendMessage('Hello, how are you?');

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('aiMessage');
    });

    test('should fail with empty message', async ({ apiClient }) => {
      const email = `chat_empty_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      await apiClient.createCharacter({ name: `EmptyChar_${timestamp}` });
      
      const { response } = await apiClient.sendMessage('');

      expect(response.status()).toBe(400);
    });

    test('should fail without auth', async ({ apiClient }) => {
      apiClient.clearAccessToken();
      
      const { response } = await apiClient.sendMessage('Test message');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/chat/history', () => {
    test('should get chat history', async ({ apiClient }) => {
      const email = `chat_history_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      await apiClient.createCharacter({ name: `HistoryChar_${timestamp}` });
      
      // Send a message first
      await apiClient.sendMessage('Test for history');
      
      const { response, data } = await apiClient.getChatHistory();

      expect(response.status()).toBe(200);
      // data.data can be array or object with messages property
      const messages = Array.isArray(data.data) ? data.data : data.data?.messages;
      expect(messages || data.data).toBeTruthy();
    });

    test('should support pagination', async ({ apiClient }) => {
      const email = `chat_page_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      await apiClient.createCharacter({ name: `PageChar_${timestamp}` });
      
      const { response, data } = await apiClient.getChatHistory({ page: 1, limit: 5 });

      expect(response.status()).toBe(200);
      // data.data can be array or object with messages property
      const messages = Array.isArray(data.data) ? data.data : data.data?.messages;
      if (messages) {
        expect(messages.length).toBeLessThanOrEqual(5);
      }
    });

    test('should fail without auth', async ({ apiClient }) => {
      apiClient.clearAccessToken();
      
      const { response } = await apiClient.getChatHistory();

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/chat/search', () => {
    test('should search chat history', async ({ apiClient }) => {
      const email = `chat_search_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      await apiClient.createCharacter({ name: `SearchChar_${timestamp}` });
      
      const { response, data } = await apiClient.searchChatHistory('hello');

      expect(response.status()).toBe(200);
      // data.data can be array or object with messages property
      const messages = Array.isArray(data.data) ? data.data : data.data?.messages;
      expect(messages || data.data).toBeTruthy();
    });
  });
});
