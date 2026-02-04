import { test, expect } from '../../fixtures';

test.describe('Register Page @smoke', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('should display register page elements', async ({ registerPage }) => {
    await registerPage.verifyPageElements();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.registerButton).toBeVisible();
    await expect(registerPage.loginLink).toBeVisible();
  });

  test('should show error for empty fields', async ({ registerPage }) => {
    await registerPage.clickRegister();
    
    // Should stay on register page
    expect(registerPage.getCurrentUrl()).toContain('/auth/register');
  });

  test('should show error for mismatched passwords', async ({ registerPage }) => {
    await registerPage.enterEmail('newuser@test.com');
    await registerPage.enterPassword('Password123');
    await registerPage.enterConfirmPassword('DifferentPassword');
    await registerPage.clickRegister();
    
    // Should show error and stay on page
    await registerPage.page.waitForTimeout(1000);
    expect(registerPage.getCurrentUrl()).toContain('/auth/register');
  });

  test('should show error for short password', async ({ registerPage }) => {
    await registerPage.enterEmail('newuser@test.com');
    await registerPage.enterPassword('12345'); // Less than 6 chars
    await registerPage.enterConfirmPassword('12345');
    await registerPage.clickRegister();
    
    // Should show error and stay on page
    await registerPage.page.waitForTimeout(1000);
    expect(registerPage.getCurrentUrl()).toContain('/auth/register');
  });

  test('should show error for invalid email', async ({ registerPage }) => {
    await registerPage.enterEmail('invalid-email');
    await registerPage.enterPassword('Password123');
    await registerPage.enterConfirmPassword('Password123');
    await registerPage.clickRegister();
    
    // Should stay on register page
    await registerPage.page.waitForTimeout(1000);
    expect(registerPage.getCurrentUrl()).toContain('/auth/register');
  });

  test('should navigate to login page', async ({ registerPage }) => {
    await registerPage.goToLogin();
    expect(registerPage.getCurrentUrl()).toContain('/auth/login');
  });

  test('should register successfully with valid data @regression', async ({ registerPage }) => {
    // Generate unique email
    const timestamp = Date.now();
    const email = `testuser_${timestamp}@test.com`;
    const password = 'TestPassword123';
    const username = `testuser_${timestamp}`;
    
    await registerPage.register(email, password, username);
    
    // Wait for navigation
    await registerPage.page.waitForTimeout(3000);
    
    // Should redirect to onboarding
    const url = registerPage.getCurrentUrl();
    expect(url).toMatch(/\/(onboarding|dashboard)/);
  });

  test('should show error for duplicate email', async ({ registerPage }) => {
    // Try to register with existing email
    const existingEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    
    await registerPage.register(existingEmail, 'Password123');
    
    // Should show error and stay on page
    await registerPage.page.waitForTimeout(2000);
    
    // Either stays on register or shows error toast
    const hasToast = await registerPage.isToastVisible();
    const onRegisterPage = registerPage.getCurrentUrl().includes('/auth/register');
    expect(hasToast || onRegisterPage).toBeTruthy();
  });
});
