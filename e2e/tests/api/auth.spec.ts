import { test, expect } from '../fixtures';

test.describe('Auth API @api', () => {
  // Run tests serially to avoid rate limiting
  test.describe.configure({ mode: 'serial' });
  const timestamp = Date.now();

  test.describe('POST /api/auth/register', () => {
    test('should register new user successfully', async ({ apiClient }) => {
      const email = `api_test_${timestamp}_1@test.com`;
      const password = 'TestPassword123';
      const username = `apiuser_${timestamp}`;

      const { response, data } = await apiClient.register(email, password, username);

      expect(response.status()).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('tokens');
      expect(data.data.tokens).toHaveProperty('accessToken');
    });

    test('should fail for duplicate email', async ({ apiClient }) => {
      const email = `dup_${timestamp}@test.com`;
      
      // First registration
      await apiClient.register(email, 'Password123');

      // Duplicate registration
      const { response, data } = await apiClient.register(email, 'Password123');

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    test('should fail for invalid email', async ({ apiClient }) => {
      const { response } = await apiClient.register('invalid-email', 'Password123');

      expect(response.status()).toBe(400);
    });

    test('should fail for short password', async ({ apiClient }) => {
      const email = `short_${timestamp}@test.com`;
      const { response } = await apiClient.register(email, '123');

      expect(response.status()).toBe(400);
    });
  });

  test.describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async ({ apiClient }) => {
      const email = `login_test_${timestamp}@test.com`;
      
      // Register first
      await apiClient.register(email, 'Password123');

      // Login
      const { response, data } = await apiClient.login(email, 'Password123');

      expect(response.status()).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('tokens');
      expect(data.data.tokens).toHaveProperty('accessToken');
    });

    test('should fail for invalid credentials', async ({ apiClient }) => {
      const { response, data } = await apiClient.login('nonexistent@email.com', 'wrongpass');

      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    test('should fail for wrong password', async ({ apiClient }) => {
      const email = `wrong_pass_${timestamp}@test.com`;
      await apiClient.register(email, 'CorrectPassword123');

      const { response } = await apiClient.login(email, 'WrongPassword123');

      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/auth/logout', () => {
    test('should logout successfully', async ({ apiClient }) => {
      const email = `logout_${timestamp}@test.com`;
      
      // Register and login
      await apiClient.register(email, 'Password123');
      await apiClient.login(email, 'Password123');

      // Logout
      const { response } = await apiClient.logout();

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should request password reset', async ({ apiClient }) => {
      const email = process.env.TEST_USER_EMAIL || 'test@example.com';
      const { response } = await apiClient.forgotPassword(email);

      // Should succeed or show user not found
      expect([200, 400, 404]).toContain(response.status());
    });

    test('should fail verify OTP with invalid code', async ({ apiClient }) => {
      const email = process.env.TEST_USER_EMAIL || 'test@example.com';
      const { response } = await apiClient.verifyOTP(email, '000000');

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Health Check @api @smoke', () => {
  test('should return health status', async ({ apiClient }) => {
    const { response, data } = await apiClient.healthCheck();

    expect(response.status()).toBe(200);
    expect(data).toHaveProperty('status');
  });
});
