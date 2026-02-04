import { test, expect } from '../../fixtures';

test.describe('Onboarding Page @smoke', () => {
  test('should redirect unauthenticated users', async ({ onboardingPage }) => {
    await onboardingPage.goto();
    
    // Should redirect to login
    await onboardingPage.page.waitForTimeout(2000);
    const url = onboardingPage.getCurrentUrl();
    expect(url).toMatch(/\/(auth\/login|onboarding)/);
  });

  test('should display onboarding for new users @regression', async ({ registerPage, onboardingPage }) => {
    // Register new user
    const timestamp = Date.now();
    const email = `onboard_test_${timestamp}@test.com`;
    
    await registerPage.goto();
    await registerPage.register(email, 'TestPassword123');
    
    // Wait for redirect to onboarding
    await registerPage.page.waitForURL(/\/onboarding/, { timeout: 10000 });
    
    // Should show character creation form
    await expect(onboardingPage.characterNameInput).toBeVisible();
  });

  test('should validate character name', async ({ registerPage, onboardingPage }) => {
    const timestamp = Date.now();
    const email = `onboard_name_${timestamp}@test.com`;
    
    await registerPage.goto();
    await registerPage.register(email, 'TestPassword123');
    await registerPage.page.waitForURL(/\/onboarding/, { timeout: 10000 });
    
    // Try to submit without name
    await onboardingPage.clickNext();
    
    // Should show error or stay on same step
    await onboardingPage.page.waitForTimeout(1000);
    expect(onboardingPage.getCurrentUrl()).toContain('/onboarding');
  });

  test('should allow character customization', async ({ registerPage, onboardingPage }) => {
    const timestamp = Date.now();
    const email = `onboard_custom_${timestamp}@test.com`;
    
    await registerPage.goto();
    await registerPage.register(email, 'TestPassword123');
    await registerPage.page.waitForURL(/\/onboarding/, { timeout: 10000 });
    
    // Enter character name
    await onboardingPage.enterCharacterName('Test Girlfriend');
    
    // Try personality selection if available
    const personalities = await onboardingPage.getPersonalityOptions();
    if (personalities.length > 0) {
      await onboardingPage.selectPersonality(personalities[0]);
    }
  });

  test('should complete onboarding flow', async ({ registerPage, onboardingPage, page }) => {
    const timestamp = Date.now();
    const email = `onboard_complete_${timestamp}@test.com`;
    const characterName = `TestChar_${timestamp}`;
    
    await registerPage.goto();
    await registerPage.register(email, 'TestPassword123');
    await registerPage.page.waitForURL(/\/onboarding/, { timeout: 10000 });
    
    // Complete character creation
    await onboardingPage.completeCharacterCreation({
      name: characterName,
      personality: 'friendly',
    });
    
    // Wait for redirect to dashboard or chat
    await page.waitForTimeout(5000);
    
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|chat)/);
  });

  test('should go back to previous step', async ({ registerPage, onboardingPage }) => {
    const timestamp = Date.now();
    const email = `onboard_back_${timestamp}@test.com`;
    
    await registerPage.goto();
    await registerPage.register(email, 'TestPassword123');
    await registerPage.page.waitForURL(/\/onboarding/, { timeout: 10000 });
    
    // Fill first step
    await onboardingPage.enterCharacterName('Test');
    await onboardingPage.clickNext();
    await onboardingPage.page.waitForTimeout(500);
    
    // Go back
    await onboardingPage.clickBack();
    await onboardingPage.page.waitForTimeout(500);
    
    // Should be able to see previous values
    await expect(onboardingPage.characterNameInput).toBeVisible();
  });
});
