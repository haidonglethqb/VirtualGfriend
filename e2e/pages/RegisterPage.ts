import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * RegisterPage - Page Object for the Register page
 * Path: /auth/register
 */
export class RegisterPage extends BasePage {
  readonly url = '/auth/register';

  // Form elements
  readonly emailInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly showPasswordButton: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    
    this.emailInput = page.locator('input[type="email"]');
    this.usernameInput = page.locator('input[name="username"], input[placeholder*="username" i]');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.showPasswordButton = page.locator('button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)').first();
    this.registerButton = page.locator('button[type="submit"]').filter({ hasText: /Đăng ký|Register/i });
    this.loginLink = page.locator('a[href="/auth/login"]');
    this.pageTitle = page.locator('h1, [class*="CardTitle"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.registerButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async enterEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  async enterUsername(username: string): Promise<void> {
    // Username is optional
    if (await this.usernameInput.isVisible()) {
      await this.fillInput(this.usernameInput, username);
    }
  }

  async enterPassword(password: string): Promise<void> {
    await this.fillInput(this.passwordInput, password);
  }

  async enterConfirmPassword(password: string): Promise<void> {
    await this.fillInput(this.confirmPasswordInput, password);
  }

  async clickRegister(): Promise<void> {
    await this.registerButton.click();
  }

  /**
   * Complete registration flow
   */
  async register(email: string, password: string, username?: string): Promise<void> {
    await this.enterEmail(email);
    if (username) {
      await this.enterUsername(username);
    }
    await this.enterPassword(password);
    await this.enterConfirmPassword(password);
    await this.clickRegister();
  }

  /**
   * Register and wait for onboarding
   */
  async registerAndWaitForOnboarding(email: string, password: string, username?: string): Promise<void> {
    await this.register(email, password, username);
    await this.waitForNavigation(/\/onboarding/);
  }

  async goToLogin(): Promise<void> {
    await this.loginLink.click();
    await this.waitForNavigation(/\/auth\/login/);
  }

  async verifyPageElements(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.registerButton).toBeVisible();
    await expect(this.loginLink).toBeVisible();
  }
}
