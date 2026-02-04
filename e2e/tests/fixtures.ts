import { test as base, expect } from '@playwright/test';
import { 
  LoginPage, 
  RegisterPage, 
  DashboardPage, 
  ChatPage, 
  OnboardingPage,
  ForgotPasswordPage,
  VerifyOTPPage,
  ResetPasswordPage 
} from '../pages';
import { ApiClient } from '../api';

/**
 * Custom fixtures for VGfriend E2E tests
 */
export interface TestFixtures {
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
  
  // Pre-authenticated page
  authenticatedPage: void;
}

/**
 * Extended test with all fixtures
 */
export const test = base.extend<TestFixtures>({
  // Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },

  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },

  forgotPasswordPage: async ({ page }, use) => {
    await use(new ForgotPasswordPage(page));
  },

  verifyOTPPage: async ({ page }, use) => {
    await use(new VerifyOTPPage(page));
  },

  resetPasswordPage: async ({ page }, use) => {
    await use(new ResetPasswordPage(page));
  },

  // API Client
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
  },

  // Pre-authenticated fixture
  authenticatedPage: async ({ page, loginPage }, use) => {
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test123456';

    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(email, password);

    await use();
  },
});

export { expect };
