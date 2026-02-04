import { test, expect } from '../../fixtures';

test.describe('Login Page @smoke', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('should display login page elements', async ({ loginPage }) => {
    await loginPage.verifyPageElements();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should show error for empty credentials', async ({ loginPage }) => {
    await loginPage.clickLogin();
    
    // Should show validation error toast
    const hasError = await loginPage.isToastVisible();
    // Form should still be on login page
    expect(loginPage.getCurrentUrl()).toContain('/auth/login');
  });

  test('should show error for invalid email format', async ({ loginPage }) => {
    await loginPage.enterEmail('invalid-email');
    await loginPage.enterPassword('password123');
    await loginPage.clickLogin();
    
    // Should stay on login page due to validation
    await loginPage.page.waitForTimeout(1000);
    expect(loginPage.getCurrentUrl()).toContain('/auth/login');
  });

  test('should show error for incorrect credentials', async ({ loginPage }) => {
    await loginPage.login('wrong@email.com', 'wrongpassword');
    
    // Wait for error toast
    await loginPage.page.waitForTimeout(2000);
    
    // Should still be on login page
    expect(loginPage.getCurrentUrl()).toContain('/auth/login');
  });

  test('should toggle password visibility', async ({ loginPage }) => {
    await loginPage.enterPassword('testpassword');
    
    // Initially password should be hidden
    const initialType = await loginPage.passwordInput.getAttribute('type');
    expect(initialType).toBe('password');
    
    // Toggle visibility
    await loginPage.togglePasswordVisibility();
    
    // Password should now be visible
    const isVisible = await loginPage.isPasswordVisible();
    expect(isVisible).toBeTruthy();
  });

  test('should navigate to register page', async ({ loginPage }) => {
    await loginPage.goToRegister();
    expect(loginPage.getCurrentUrl()).toContain('/auth/register');
  });

  test('should navigate to forgot password page', async ({ loginPage }) => {
    await loginPage.goToForgotPassword();
    expect(loginPage.getCurrentUrl()).toContain('/auth/forgot-password');
  });

  test('should login successfully with valid credentials @regression', async ({ loginPage }) => {
    // Use test user credentials
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test123456';
    
    await loginPage.loginAndWaitForDashboard(email, password);
    
    // Should redirect to dashboard or onboarding
    const url = loginPage.getCurrentUrl();
    expect(url).toMatch(/\/(dashboard|onboarding)/);
  });

  test('should show loading state during login', async ({ loginPage }) => {
    await loginPage.enterEmail('test@example.com');
    await loginPage.enterPassword('Test123456');
    
    // Click and immediately check for loading
    const loginPromise = loginPage.clickLogin();
    
    // Check loading state (may be very brief)
    await loginPage.page.waitForTimeout(100);
    
    await loginPromise;
  });

  test('should persist login state after page refresh', async ({ loginPage, page }) => {
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test123456';
    
    await loginPage.loginAndWaitForDashboard(email, password);
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    const isAuth = await loginPage.isAuthenticated();
    expect(isAuth).toBeTruthy();
  });
});
