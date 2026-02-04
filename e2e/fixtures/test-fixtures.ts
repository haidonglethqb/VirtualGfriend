import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ChatPage,
  OnboardingPage,
  ForgotPasswordPage,
  VerifyOTPPage,
  ResetPasswordPage,
} from '../pages';
import { ApiClient } from '../api/ApiClient';

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'Test123456',
};

// Extend Playwright test with custom fixtures
type PageFixtures = {
  // Page Objects
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  chatPage: ChatPage;
  onboardingPage: OnboardingPage;
  forgotPasswordPage: ForgotPasswordPage;
  verifyOTPPage: VerifyOTPPage;
  resetPasswordPage: ResetPasswordPage;
  
  // API Client
  apiClient: ApiClient;
  
  // Authenticated page (already logged in)
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
};

/**
 * Extended test with all page objects and utilities
 */
export const test = base.extend<PageFixtures>({
  // Page Objects
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page);
    await use(chatPage);
  },

  onboardingPage: async ({ page }, use) => {
    const onboardingPage = new OnboardingPage(page);
    await use(onboardingPage);
  },

  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await use(forgotPasswordPage);
  },

  verifyOTPPage: async ({ page }, use) => {
    const verifyOTPPage = new VerifyOTPPage(page);
    await use(verifyOTPPage);
  },

  resetPasswordPage: async ({ page }, use) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await use(resetPasswordPage);
  },

  // API Client
  apiClient: async ({ request }, use) => {
    const apiClient = new ApiClient(request);
    await use(apiClient);
  },

  // Authenticated page - logs in before each test
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login via API to get token
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
    const response = await page.request.post(`${apiUrl}/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });
    
    if (response.ok()) {
      const data = await response.json();
      // Handle both old and new response formats
      const tokens = data.data?.tokens || data.data;
      const accessToken = tokens?.accessToken;
      const refreshToken = tokens?.refreshToken;
      const user = data.data?.user;
      
      if (accessToken) {
        // Set auth in localStorage
        await page.goto('/');
        await page.evaluate((authData) => {
          localStorage.setItem('vgfriend-auth', JSON.stringify({
            state: {
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              user: authData.user,
              isAuthenticated: true,
            },
            version: 0,
          }));
        }, { accessToken, refreshToken, user });
      }
    }
    
    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
  },
});

export { expect };
export { TEST_USER };
