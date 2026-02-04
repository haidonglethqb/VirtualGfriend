import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage - Page Object for the Login page
 * Path: /auth/login
 */
export class LoginPage extends BasePage {
  // Page URL
  readonly url = '/auth/login';

  // Page elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly showPasswordButton: Locator;
  readonly loginButton: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;
  readonly heartIcon: Locator;

  constructor(page: Page) {
    super(page);
    
    // Form elements
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"], input[placeholder*="••"]');
    this.showPasswordButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first();
    this.loginButton = page.locator('button[type="submit"]');
    this.registerLink = page.locator('a[href="/auth/register"]');
    this.forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]');
    
    // Page content
    this.pageTitle = page.locator('h1, [class*="CardTitle"]').first();
    this.pageDescription = page.locator('[class*="CardDescription"]');
    this.heartIcon = page.locator('svg.lucide-heart');
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Enter email
   */
  async enterEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  /**
   * Enter password
   */
  async enterPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordButton.click();
  }

  /**
   * Check if password is visible
   */
  async isPasswordVisible(): Promise<boolean> {
    const inputType = await this.passwordInput.getAttribute('type');
    return inputType === 'text';
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  /**
   * Login and wait for navigation to dashboard
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.waitForNavigation(/\/dashboard|\/onboarding/);
  }

  /**
   * Navigate to register page
   */
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
    await this.waitForNavigation(/\/auth\/register/);
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.waitForNavigation(/\/auth\/forgot-password/);
  }

  /**
   * Check if login button is loading
   */
  async isLoginButtonLoading(): Promise<boolean> {
    const spinner = this.loginButton.locator('.animate-spin');
    return spinner.isVisible();
  }

  /**
   * Get validation error message
   */
  async getErrorMessage(): Promise<string> {
    return this.getToastMessage();
  }

  /**
   * Verify page is displayed correctly
   */
  async verifyPageElements(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.registerLink).toBeVisible();
  }
}
