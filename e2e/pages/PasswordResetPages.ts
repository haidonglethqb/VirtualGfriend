import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ForgotPasswordPage - Page Object for Forgot Password flow
 * Path: /auth/forgot-password
 */
export class ForgotPasswordPage extends BasePage {
  readonly url = '/auth/forgot-password';

  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    
    this.emailInput = page.locator('input[type="email"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.backToLoginLink = page.locator('a[href="/auth/login"], a:has-text("Quay lại")');
    this.pageTitle = page.locator('h1');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async enterEmail(email: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
  }

  async submitEmail(email: string): Promise<void> {
    await this.enterEmail(email);
    await this.submitButton.click();
  }

  /**
   * Alias for submitEmail
   */
  async requestOTP(email: string): Promise<void> {
    await this.submitEmail(email);
  }

  /**
   * Alias for submitButton click
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async goToLogin(): Promise<void> {
    await this.backToLoginLink.click();
  }

  async verifyPageElements(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}

/**
 * VerifyOTPPage - Page Object for OTP verification
 * Path: /auth/verify-otp
 */
export class VerifyOTPPage extends BasePage {
  readonly url = '/auth/verify-otp';

  readonly otpInputs: Locator;
  readonly verifyButton: Locator;
  readonly resendButton: Locator;
  readonly countdownTimer: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.otpInputs = page.locator('input[maxlength="1"]');
    this.verifyButton = page.locator('button[type="submit"], button:has-text("Xác thực")');
    this.resendButton = page.locator('button:has-text("Gửi lại")');
    this.countdownTimer = page.locator('[data-testid="countdown"]');
    this.backButton = page.locator('a:has-text("Quay lại")');
  }

  async goto(email?: string): Promise<void> {
    const url = email ? `${this.url}?email=${encodeURIComponent(email)}` : this.url;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.otpInputs.first().waitFor({ state: 'visible' });
  }

  /**
   * Enter OTP digits
   */
  async enterOTP(otp: string): Promise<void> {
    const digits = otp.split('');
    for (let i = 0; i < digits.length && i < 6; i++) {
      await this.otpInputs.nth(i).fill(digits[i]);
    }
  }

  async submitOTP(otp: string): Promise<void> {
    await this.enterOTP(otp);
    await this.verifyButton.click();
  }

  /**
   * Alias for submitOTP
   */
  async verifyOTP(otp: string): Promise<void> {
    await this.submitOTP(otp);
  }

  /**
   * Alias for verifyButton click
   */
  async submit(): Promise<void> {
    await this.verifyButton.click();
  }

  async clickResend(): Promise<void> {
    await this.resendButton.click();
  }

  async isResendEnabled(): Promise<boolean> {
    return this.resendButton.isEnabled();
  }

  async verifyPageElements(): Promise<void> {
    await expect(this.otpInputs.first()).toBeVisible();
    await expect(this.verifyButton).toBeVisible();
  }
}

/**
 * ResetPasswordPage - Page Object for Reset Password
 * Path: /auth/reset-password
 */
export class ResetPasswordPage extends BasePage {
  readonly url = '/auth/reset-password';

  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly passwordStrengthIndicator: Locator;
  readonly showPasswordButtons: Locator;

  constructor(page: Page) {
    super(page);
    
    this.newPasswordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.submitButton = page.locator('button[type="submit"]');
    this.passwordStrengthIndicator = page.locator('[data-testid="password-strength"]');
    this.showPasswordButtons = page.locator('button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)');
  }

  async goto(email?: string, token?: string): Promise<void> {
    let url = this.url;
    if (email && token) {
      url = `${this.url}?email=${encodeURIComponent(email)}&token=${token}`;
    }
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.newPasswordInput.waitFor({ state: 'visible' });
  }

  async enterNewPassword(password: string): Promise<void> {
    await this.fillInput(this.newPasswordInput, password);
  }

  async enterConfirmPassword(password: string): Promise<void> {
    await this.fillInput(this.confirmPasswordInput, password);
  }

  async resetPassword(password: string): Promise<void> {
    await this.enterNewPassword(password);
    await this.enterConfirmPassword(password);
    await this.submitButton.click();
  }

  /**
   * Alias for submitButton click
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async verifyPageElements(): Promise<void> {
    await expect(this.newPasswordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
