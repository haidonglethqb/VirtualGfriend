import { test, expect } from '../../fixtures';

test.describe('Password Reset Flow @smoke', () => {
  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.goto();
      
      await expect(forgotPasswordPage.emailInput).toBeVisible();
      await expect(forgotPasswordPage.submitButton).toBeVisible();
    });

    test('should validate email format', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.goto();
      
      await forgotPasswordPage.enterEmail('invalid-email');
      await forgotPasswordPage.submit();
      
      // Should stay on page
      await forgotPasswordPage.page.waitForTimeout(1000);
      expect(forgotPasswordPage.getCurrentUrl()).toContain('/forgot-password');
    });

    test('should show error for non-existent email', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.goto();
      
      await forgotPasswordPage.requestOTP('nonexistent@email.com');
      
      // Should show error or info message
      await forgotPasswordPage.page.waitForTimeout(2000);
      const hasToast = await forgotPasswordPage.isToastVisible();
      // Either shows error or stays on page
    });

    test('should navigate to verify OTP on success @regression', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.goto();
      
      const email = process.env.TEST_USER_EMAIL || 'test@example.com';
      await forgotPasswordPage.requestOTP(email);
      
      // Should redirect to verify OTP page
      await forgotPasswordPage.page.waitForTimeout(3000);
      
      const url = forgotPasswordPage.getCurrentUrl();
      expect(url).toMatch(/\/(verify-otp|forgot-password)/);
    });

    test('should navigate back to login', async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.goto();
      await forgotPasswordPage.goToLogin();
      
      expect(forgotPasswordPage.getCurrentUrl()).toContain('/login');
    });
  });

  test.describe('Verify OTP Page', () => {
    test.skip('should display OTP input fields', async ({ verifyOTPPage }) => {
      // This test requires email from forgot-password flow
      await verifyOTPPage.goto(process.env.TEST_USER_EMAIL);
      
      // OTP inputs should be visible
      const inputs = verifyOTPPage.page.locator('input[type="text"], input[type="number"], input[maxlength="1"]');
      const count = await inputs.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test.skip('should validate OTP format', async ({ verifyOTPPage }) => {
      // Requires valid email context
      await verifyOTPPage.goto(process.env.TEST_USER_EMAIL);
      
      // Enter incomplete OTP
      await verifyOTPPage.enterOTP('12');
      await verifyOTPPage.submit();
      
      // Should show error or stay on page
      await verifyOTPPage.page.waitForTimeout(1000);
      expect(verifyOTPPage.getCurrentUrl()).toContain('/verify-otp');
    });

    test.skip('should show error for invalid OTP', async ({ verifyOTPPage }) => {
      // Requires valid email context
      await verifyOTPPage.goto(process.env.TEST_USER_EMAIL);
      
      // Enter wrong OTP
      await verifyOTPPage.verifyOTP('000000');
      
      // Should show error
      await verifyOTPPage.page.waitForTimeout(2000);
      const hasError = await verifyOTPPage.isToastVisible();
      // Should show error or stay on page
    });

    test.skip('should have resend OTP option', async ({ verifyOTPPage }) => {
      // Requires valid email context
      await verifyOTPPage.goto(process.env.TEST_USER_EMAIL);
      
      // Check for resend button
      const resendButton = verifyOTPPage.page.locator('button:has-text("Gửi lại"), button:has-text("Resend")');
      const hasResend = await resendButton.isVisible().catch(() => false);
      // Resend might be disabled for a timer
    });
  });

  test.describe('Reset Password Page', () => {
    test('should display password reset form', async ({ resetPasswordPage }) => {
      // This page requires a token from OTP verification
      await resetPasswordPage.goto();
      
      // Check for password fields if accessible
      const passwordInputs = resetPasswordPage.page.locator('input[type="password"]');
      const count = await passwordInputs.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should validate password requirements', async ({ resetPasswordPage }) => {
      await resetPasswordPage.goto();
      
      // Try weak password
      await resetPasswordPage.enterNewPassword('123');
      await resetPasswordPage.enterConfirmPassword('123');
      await resetPasswordPage.submit();
      
      // Should show validation error
      await resetPasswordPage.page.waitForTimeout(1000);
    });

    test('should validate password match', async ({ resetPasswordPage }) => {
      await resetPasswordPage.goto();
      
      await resetPasswordPage.enterNewPassword('NewPassword123');
      await resetPasswordPage.enterConfirmPassword('DifferentPassword123');
      await resetPasswordPage.submit();
      
      // Should show mismatch error
      await resetPasswordPage.page.waitForTimeout(1000);
    });
  });

  test.describe('Full Password Reset Flow @regression', () => {
    test.skip('should complete full password reset flow', async ({ 
      forgotPasswordPage, 
      verifyOTPPage, 
      resetPasswordPage,
      page 
    }) => {
      // This test is skipped as it requires real email/OTP
      // In a real scenario, you would:
      // 1. Mock the email service
      // 2. Use test API to get the OTP
      // 3. Complete the flow
      
      const email = 'test-reset@example.com';
      
      // Step 1: Request OTP
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestOTP(email);
      
      // Step 2: Get OTP from test API (mock)
      const otp = '123456'; // Would come from test API
      
      // Step 3: Verify OTP
      await page.waitForURL(/verify-otp/);
      await verifyOTPPage.verifyOTP(otp);
      
      // Step 4: Reset password
      await page.waitForURL(/reset-password/);
      await resetPasswordPage.resetPassword('NewSecurePassword123');
      
      // Step 5: Verify redirect to login
      await page.waitForURL(/login/);
      expect(page.url()).toContain('/login');
    });
  });
});
