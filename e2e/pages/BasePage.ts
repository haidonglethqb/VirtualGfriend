import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage - Abstract base class for all Page Objects
 * Contains common methods and utilities shared across all pages
 */
export abstract class BasePage {
  readonly page: Page;
  
  // Common elements
  readonly loadingSpinner: Locator;
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Common locators
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.toastContainer = page.locator('[data-sonner-toaster], [role="status"]');
    this.toastMessage = page.locator('[data-sonner-toast], .toast-message');
  }

  /**
   * Navigate to the page URL
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   */
  abstract waitForPageLoad(): Promise<void>;

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Get the current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string | RegExp): Promise<void> {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Check if toast message is visible
   */
  async isToastVisible(): Promise<boolean> {
    return this.toastMessage.isVisible().catch(() => false);
  }

  /**
   * Get toast message text
   */
  async getToastMessage(): Promise<string> {
    await this.toastMessage.waitFor({ state: 'visible', timeout: 5000 });
    const text = await this.toastMessage.textContent();
    return text ?? '';
  }

  /**
   * Wait for toast message with specific text
   */
  async waitForToast(text: string | RegExp): Promise<void> {
    await expect(this.toastMessage).toContainText(text, { timeout: 10000 });
  }

  /**
   * Close toast message if visible
   */
  async closeToast(): Promise<void> {
    const closeButton = this.page.locator('[data-sonner-toast] button[aria-label="Close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Scroll to element
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: Locator, timeout = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Fill input with clear first
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Click with retry
   */
  async clickWithRetry(locator: Locator, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await locator.click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Get local storage item
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set local storage item
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
  }

  /**
   * Clear local storage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Get cookies
   */
  async getCookies() {
    return this.page.context().cookies();
  }

  /**
   * Add cookie
   */
  async addCookie(cookie: { name: string; value: string; domain?: string; path?: string }) {
    await this.page.context().addCookies([{
      ...cookie,
      domain: cookie.domain || 'localhost',
      path: cookie.path || '/',
    }]);
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is authenticated (by checking localStorage)
   */
  async isAuthenticated(): Promise<boolean> {
    const authData = await this.getLocalStorageItem('vgfriend-auth');
    if (!authData) return false;
    try {
      const parsed = JSON.parse(authData);
      return !!parsed.state?.accessToken;
    } catch {
      return false;
    }
  }
}
