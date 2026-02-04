import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Test file pattern
  testMatch: '**/*.spec.ts',
  
  // Timeout for each test
  timeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : parseInt(process.env.RETRY_COUNT || '1'),
  
  // Number of workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: BASE_URL,
    
    // Extra HTTP headers for API requests
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'on-first-retry',
    
    // Action timeout
    actionTimeout: parseInt(process.env.ACTION_TIMEOUT || '15000'),
    
    // Navigation timeout
    navigationTimeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000'),
    
    // Headless mode
    headless: process.env.HEADLESS !== 'false',
    
    // Slow down actions for debugging
    launchOptions: {
      slowMo: parseInt(process.env.SLOW_MO || '0'),
    },
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs before all tests
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
    
    // API tests - runs only once (no browser needed)
    {
      name: 'api',
      testMatch: '**/tests/api/**/*.spec.ts',
      use: {
        // No browser needed for API tests
      },
      dependencies: ['setup'],
    },
    
    // Desktop browsers - only UI tests
    {
      name: 'chromium',
      testIgnore: '**/tests/api/**/*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { 
          width: parseInt(process.env.DEFAULT_VIEWPORT_WIDTH || '1280'), 
          height: parseInt(process.env.DEFAULT_VIEWPORT_HEIGHT || '720') 
        },
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: '**/tests/api/**/*.spec.ts',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { 
          width: parseInt(process.env.DEFAULT_VIEWPORT_WIDTH || '1280'), 
          height: parseInt(process.env.DEFAULT_VIEWPORT_HEIGHT || '720') 
        },
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testIgnore: '**/tests/api/**/*.spec.ts',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { 
          width: parseInt(process.env.DEFAULT_VIEWPORT_WIDTH || '1280'), 
          height: parseInt(process.env.DEFAULT_VIEWPORT_HEIGHT || '720') 
        },
      },
      dependencies: ['setup'],
    },

    // Mobile browsers - only UI tests
    {
      name: 'Mobile Chrome',
      testIgnore: '**/tests/api/**/*.spec.ts',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      testIgnore: '**/tests/api/**/*.spec.ts',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'cd ../server && npm run dev',
      url: API_BASE_URL.replace('/api', '/health'),
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../client && npm run dev',
      url: BASE_URL,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
