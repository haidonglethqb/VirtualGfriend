import { test, expect } from '../../fixtures';

test.describe('Dashboard Page @smoke', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    // Login first
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test123456';
    
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(email, password);
  });

  test('should display dashboard after login', async ({ dashboardPage, page }) => {
    // Navigate to dashboard if not already there
    if (!page.url().includes('/dashboard')) {
      await dashboardPage.goto();
    }
    
    // Should be on dashboard or onboarding
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding)/);
  });

  test('should show character info or create button', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForPageLoad();
    
    const hasCharacter = await dashboardPage.hasCharacter();
    const needsCreation = await dashboardPage.needsCharacterCreation();
    
    // Should have either character or create button
    expect(hasCharacter || needsCreation).toBeTruthy();
  });

  test('should navigate to chat page', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    
    // Only test if character exists
    const hasCharacter = await dashboardPage.hasCharacter();
    if (hasCharacter) {
      await dashboardPage.goToChat();
      expect(dashboardPage.getCurrentUrl()).toContain('/chat');
    }
  });

  test('should navigate to settings page', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.goToSettings();
    expect(dashboardPage.getCurrentUrl()).toContain('/settings');
  });

  test('should show navigation elements', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForPageLoad();
    
    // Check nav elements are visible
    await expect(dashboardPage.navChat).toBeVisible();
    await expect(dashboardPage.navSettings).toBeVisible();
  });
});

test.describe('Dashboard - Character Creation @regression', () => {
  test('should redirect to onboarding for new users', async ({ page, registerPage }) => {
    // Register new user
    const timestamp = Date.now();
    const email = `newuser_dashboard_${timestamp}@test.com`;
    
    await registerPage.goto();
    await registerPage.register(email, 'TestPassword123');
    
    // Should go to onboarding
    await page.waitForURL(/\/onboarding/, { timeout: 10000 });
    expect(page.url()).toContain('/onboarding');
  });
});
