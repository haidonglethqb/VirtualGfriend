import { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'e2e_test_user@test.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test123456';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Global Setup: Preparing test environment...');
  
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
  
  // Check if API is available
  try {
    const response = await fetch(apiBaseUrl.replace('/api', '/health'));
    if (!response.ok) {
      console.warn('⚠️ API health check failed, tests may fail');
    } else {
      console.log('✅ API is healthy');
    }
  } catch (error) {
    console.warn('⚠️ Could not connect to API:', error);
    return;
  }
  
  // Create test user if not exists
  try {
    // Try to register test user
    const registerResponse = await fetch(`${apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Playwright-Test': 'true',
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        username: 'e2e_test_user',
      }),
    });
    
    if (registerResponse.ok) {
      console.log('✅ Test user created:', TEST_USER_EMAIL);
      
      // Create character for test user
      const registerData = await registerResponse.json();
      const accessToken = registerData.data?.tokens?.accessToken || registerData.data?.accessToken;
      
      if (accessToken) {
        const charResponse = await fetch(`${apiBaseUrl}/character`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Playwright-Test': 'true',
          },
          body: JSON.stringify({
            name: 'E2E Test Character',
            personality: 'caring',
          }),
        });
        
        if (charResponse.ok) {
          console.log('✅ Test character created');
        }
      }
    } else {
      const errorData = await registerResponse.json().catch(() => ({}));
      if (errorData.message?.includes('already') || registerResponse.status === 409) {
        console.log('ℹ️ Test user already exists:', TEST_USER_EMAIL);
      } else {
        console.log('⚠️ Could not create test user:', errorData.message || registerResponse.status);
      }
    }
  } catch (error) {
    console.warn('⚠️ Error creating test user:', error);
  }
  
  console.log('✅ Global Setup completed');
}

export default globalSetup;
