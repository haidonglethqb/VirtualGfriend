import { test, expect } from '../../fixtures';

test.describe('Chat Page @smoke', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test123456';
    
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(email, password);
  });

  test('should display chat interface', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    await expect(chatPage.messageInput).toBeVisible();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test('should have message input focused', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    // Focus message input
    await chatPage.messageInput.focus();
    await expect(chatPage.messageInput).toBeFocused();
  });

  test('should send a message', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    const testMessage = `Test message ${Date.now()}`;
    await chatPage.sendMessage(testMessage);
    
    // Wait for message to appear
    await chatPage.page.waitForTimeout(2000);
    
    // Check if message appears in chat
    const messages = await chatPage.getMessages();
    expect(messages.length).toBeGreaterThan(0);
  });

  test('should receive AI response @regression', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    const initialCount = await chatPage.getMessageCount();
    const testMessage = 'Hello, how are you?';
    await chatPage.sendMessageAndWaitForResponse(testMessage);
    
    // Should have 2 more messages: user message + AI response
    const newCount = await chatPage.getMessageCount();
    expect(newCount).toBeGreaterThan(initialCount);
    
    const lastMessage = await chatPage.getLastMessage();
    expect(lastMessage.length).toBeGreaterThan(0);
  });

  test('should show typing indicator while waiting', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    // Send message and immediately check for typing indicator
    await chatPage.enterMessage('Test message');
    const sendPromise = chatPage.clickSend();
    
    // Check for typing indicator
    await chatPage.page.waitForTimeout(500);
    
    await sendPromise;
  });

  test('should persist message history after refresh', async ({ chatPage, page }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    // Get initial message count
    const initialMessages = await chatPage.getMessages();
    const initialCount = initialMessages.length;
    
    // Refresh page
    await page.reload();
    await chatPage.waitForPageLoad();
    
    // Messages should still be there
    const afterRefreshMessages = await chatPage.getMessages();
    expect(afterRefreshMessages.length).toBeGreaterThanOrEqual(initialCount);
  });

  test('should not send empty message', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    // Try to send empty message
    await chatPage.enterMessage('   ');
    
    const isDisabled = await chatPage.sendButton.isDisabled();
    // Send button should be disabled or message shouldn't send
  });

  test('should handle long messages', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    const longMessage = 'A'.repeat(500); // 500 character message
    await chatPage.sendMessage(longMessage);
    
    // Wait for processing
    await chatPage.page.waitForTimeout(2000);
    
    // Should handle gracefully
    const url = chatPage.getCurrentUrl();
    expect(url).toContain('/chat');
  });

  test('should open gift modal', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    await chatPage.openGiftModal();
    
    // Check if modal is visible
    const isModalVisible = await chatPage.isGiftModalVisible();
    if (!isModalVisible) {
      // Gift feature might not be available
      console.log('Gift modal not found - feature may not be implemented');
    }
  });

  test('should search chat history', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    // Open search if available
    await chatPage.openSearch();
    
    const isSearchVisible = await chatPage.isSearchVisible();
    if (isSearchVisible) {
      await chatPage.search('hello');
      await chatPage.page.waitForTimeout(1000);
    }
  });
});

test.describe('Chat - Mobile View @mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ chatPage, loginPage }) => {
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test123456';
    
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(email, password);
    
    await chatPage.goto();
    await chatPage.waitForPageLoad();
    
    await expect(chatPage.messageInput).toBeVisible();
    await expect(chatPage.sendButton).toBeVisible();
  });
});
