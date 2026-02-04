import { Page, expect } from '@playwright/test';

/**
 * Common test helper functions
 */

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `screenshots/${name}_${timestamp}.png` });
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Wait for toast message
 */
export async function waitForToast(page: Page, timeout = 5000): Promise<string | null> {
  try {
    const toast = page.locator('[role="alert"], .toast, .notification, [class*="toast"]').first();
    await toast.waitFor({ timeout });
    return await toast.textContent();
  } catch {
    return null;
  }
}

/**
 * Clear all storage (localStorage, sessionStorage, cookies)
 */
export async function clearAllStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const boundingBox = await element.boundingBox();
  
  if (!boundingBox) return false;
  
  const viewportSize = page.viewportSize();
  if (!viewportSize) return false;
  
  return (
    boundingBox.x >= 0 &&
    boundingBox.y >= 0 &&
    boundingBox.x + boundingBox.width <= viewportSize.width &&
    boundingBox.y + boundingBox.height <= viewportSize.height
  );
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(page: Page, selector: string): Promise<void> {
  await page.locator(selector).evaluate(el => {
    return new Promise<void>(resolve => {
      const animations = el.getAnimations();
      if (animations.length === 0) {
        resolve();
        return;
      }
      Promise.all(animations.map(a => a.finished)).then(() => resolve());
    });
  });
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Check if page has specific URL pattern
 */
export function matchesUrl(page: Page, pattern: RegExp | string): boolean {
  const url = page.url();
  if (typeof pattern === 'string') {
    return url.includes(pattern);
  }
  return pattern.test(url);
}

/**
 * Wait for specific URL pattern
 */
export async function waitForUrl(page: Page, pattern: RegExp | string, timeout = 10000): Promise<void> {
  if (typeof pattern === 'string') {
    await page.waitForURL(`**${pattern}**`, { timeout });
  } else {
    await page.waitForURL(pattern, { timeout });
  }
}

/**
 * Get all console logs
 */
export function collectConsoleLogs(page: Page): string[] {
  const logs: string[] = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  return logs;
}

/**
 * Get all network requests
 */
export function collectNetworkRequests(page: Page): { url: string; method: string; status?: number }[] {
  const requests: { url: string; method: string; status?: number }[] = [];
  
  page.on('response', response => {
    requests.push({
      url: response.url(),
      method: response.request().method(),
      status: response.status(),
    });
  });
  
  return requests;
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: { status?: number; body?: object }
): Promise<void> {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body || {}),
    });
  });
}

/**
 * Intercept and modify request
 */
export async function interceptRequest(
  page: Page,
  urlPattern: string | RegExp,
  modifier: (headers: { [key: string]: string }) => { [key: string]: string }
): Promise<void> {
  await page.route(urlPattern, route => {
    const headers = modifier(route.request().headers());
    route.continue({ headers });
  });
}

/**
 * Check accessibility (basic check for visible labels)
 */
export async function checkBasicAccessibility(page: Page): Promise<{ issues: string[] }> {
  const issues: string[] = [];
  
  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    issues.push(`${imagesWithoutAlt} images without alt text`);
  }
  
  // Check for inputs without labels
  const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([aria-labelledby])').count();
  if (inputsWithoutLabels > 0) {
    issues.push(`${inputsWithoutLabels} inputs without proper labels`);
  }
  
  // Check for buttons without accessible names
  const buttonsWithoutNames = await page.locator('button:not([aria-label]):empty').count();
  if (buttonsWithoutNames > 0) {
    issues.push(`${buttonsWithoutNames} buttons without accessible names`);
  }
  
  return { issues };
}
