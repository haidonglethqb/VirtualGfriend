import { test, expect } from '../fixtures';

test.describe('Character API @api', () => {
  // Run tests serially to avoid rate limiting
  test.describe.configure({ mode: 'serial' });
  const timestamp = Date.now();

  test.describe('POST /api/character', () => {
    test('should create character', async ({ apiClient }) => {
      // Register and login first
      const email = `char_create_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      const { response, data } = await apiClient.createCharacter({
        name: `TestChar_${timestamp}`,
        personality: 'caring', // Valid enum: caring, playful, shy, passionate, intellectual
      });

      expect([200, 201]).toContain(response.status());
      expect(data.success).toBe(true);
    });

    test('should fail without auth', async ({ apiClient }) => {
      apiClient.clearAccessToken();
      
      const { response } = await apiClient.createCharacter({
        name: 'UnauthorizedChar',
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/character', () => {
    test('should get character', async ({ apiClient }) => {
      // Register and login
      const email = `char_get_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      // Create character first
      await apiClient.createCharacter({
        name: `GetTestChar_${timestamp}`,
      });
      
      const { response, data } = await apiClient.getCharacter();

      expect(response.status()).toBe(200);
      expect(data).toHaveProperty('data');
    });

    test('should fail without auth', async ({ apiClient }) => {
      apiClient.clearAccessToken();
      
      const { response } = await apiClient.getCharacter();

      expect(response.status()).toBe(401);
    });
  });

  test.describe('PUT /api/character', () => {
    test('should update character', async ({ apiClient }) => {
      // Register and login
      const email = `char_update_${timestamp}@test.com`;
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');
      
      // Create character first
      await apiClient.createCharacter({
        name: `UpdateTestChar_${timestamp}`,
      });
      
      const { response } = await apiClient.updateCharacter({
        name: `UpdatedChar_${timestamp}`,
      });

      expect(response.status()).toBe(200);
    });
  });
});
