import { test, expect } from '../fixtures';

test.describe('Quest API @api', () => {
  // Run tests serially to avoid rate limiting
  test.describe.configure({ mode: 'serial' });
  const timestamp = Date.now();

  test.describe('GET /api/quests', () => {
    test('should get all quests', async ({ apiClient }) => {
      const email = `quest_get_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response, data } = await apiClient.getQuests();

      expect(response.status()).toBe(200);
      expect(data).toHaveProperty('data');
    });

    test('should fail without auth', async ({ apiClient }) => {
      apiClient.clearAccessToken();
      
      const { response } = await apiClient.getQuests();

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/quests/daily', () => {
    test('should get daily quests', async ({ apiClient }) => {
      const email = `quest_daily_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response, data } = await apiClient.getDailyQuests();

      expect(response.status()).toBe(200);
      expect(data.data).toBeInstanceOf(Array);
    });
  });

  test.describe('POST /api/quests/:id/start', () => {
    test('should start a quest', async ({ apiClient }) => {
      const email = `quest_start_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      // Get available quests first
      const { data: questsData } = await apiClient.getQuests();
      
      if (questsData.data && questsData.data.length > 0) {
        const questId = questsData.data[0].id;
        const { response } = await apiClient.startQuest(questId);

        expect([200, 400]).toContain(response.status()); // 400 if already started
      }
    });
  });

  test.describe('POST /api/quests/:id/claim', () => {
    test('should fail claim for incomplete quest', async ({ apiClient }) => {
      const email = `quest_claim_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response } = await apiClient.claimQuestReward('nonexistent-quest-id');

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Gift API @api', () => {
  const timestamp = Date.now();

  test.describe('GET /api/gifts', () => {
    test('should get available gifts', async ({ apiClient }) => {
      const email = `gift_get_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response } = await apiClient.getGifts();

      expect(response.status()).toBe(200);
    });
  });

  test.describe('GET /api/gifts/inventory', () => {
    test('should get user inventory', async ({ apiClient }) => {
      const email = `gift_inv_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response, data } = await apiClient.getInventory();

      expect(response.status()).toBe(200);
      expect(data).toHaveProperty('data');
    });
  });
});

test.describe('Scene API @api', () => {
  const timestamp = Date.now();

  test.describe('GET /api/scenes', () => {
    test('should get available scenes', async ({ apiClient }) => {
      const email = `scene_get_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response } = await apiClient.getScenes();

      expect(response.status()).toBe(200);
    });
  });
});

test.describe('Memory API @api', () => {
  const timestamp = Date.now();

  test.describe('GET /api/memories', () => {
    test('should get memories', async ({ apiClient }) => {
      const email = `memory_get_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response } = await apiClient.getMemories();

      expect(response.status()).toBe(200);
    });
  });
});
