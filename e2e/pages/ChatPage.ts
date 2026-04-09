import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ChatPage - Page Object for the Chat page
 * Path: /chat
 */
export class ChatPage extends BasePage {
  readonly url = '/chat';

  // Chat header
  readonly characterName: Locator;
  readonly characterMood: Locator;
  readonly backButton: Locator;
  readonly sceneButton: Locator;
  readonly giftButton: Locator;

  // Message area
  readonly messagesContainer: Locator;
  readonly messagesList: Locator;
  readonly userMessage: Locator;
  readonly botMessage: Locator;
  readonly typingIndicator: Locator;

  // Input area
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly emojiButton: Locator;
  readonly micButton: Locator;

  // Gift modal
  readonly giftModal: Locator;
  readonly giftItems: Locator;
  readonly sendGiftButton: Locator;
  readonly closeGiftModal: Locator;

  // Scene selector
  readonly sceneModal: Locator;
  readonly sceneItems: Locator;

  constructor(page: Page) {
    super(page);
    
    // Header
    this.characterName = page.locator('[data-testid="chat-character-name"], .character-name');
    this.characterMood = page.locator('[data-testid="chat-character-mood"]');
    this.backButton = page.locator('button:has(svg.lucide-arrow-left)');
    this.sceneButton = page.locator('button:has(svg.lucide-image)');
    this.giftButton = page.locator('button:has(svg.lucide-gift)');

    // Messages
    this.messagesContainer = page.locator('[data-testid="messages-container"], .messages-container');
    this.messagesList = page.locator('[data-testid="message"]');
    this.userMessage = page.locator('[data-testid="user-message"], .message-user');
    this.botMessage = page.locator('[data-testid="bot-message"], .message-bot');
    this.typingIndicator = page.locator('[data-testid="typing-indicator"], .typing-indicator');

    // Input
    this.messageInput = page.getByRole('textbox', { name: /message|nhắn|type|input/i }).first();
    this.sendButton = page.getByRole('button', { name: /send|gửi|send message/i }).first();
    this.emojiButton = page.locator('button:has(svg.lucide-smile)');
    this.micButton = page.locator('button:has(svg.lucide-mic)');

    // Gift modal
    this.giftModal = page.locator('[data-testid="gift-modal"], [role="dialog"]');
    this.giftItems = page.locator('[data-testid="gift-item"]');
    this.sendGiftButton = page.locator('button:has-text("Tặng"), button:has-text("Send Gift")');
    this.closeGiftModal = page.locator('[data-testid="close-gift-modal"], button:has(svg.lucide-x)');

    // Scene selector
    this.sceneModal = page.locator('[data-testid="scene-modal"]');
    this.sceneItems = page.locator('[data-testid="scene-item"]');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.messageInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.waitForLoadingComplete();
  }

  /**
   * Type a message
   */
  async typeMessage(message: string): Promise<void> {
    await this.fillInput(this.messageInput, message);
  }

  /**
   * Send a message
   */
  async sendMessage(message: string): Promise<void> {
    await this.typeMessage(message);
    await this.sendButton.click();
  }

  /**
   * Send message and wait for response
   */
  async sendMessageAndWaitForResponse(message: string): Promise<void> {
    const currentMessagesCount = await this.messagesList.count();
    
    await this.sendMessage(message);
    
    // Wait for user message to appear
    await expect(this.messagesList).toHaveCount(currentMessagesCount + 1, { timeout: 5000 });
    
    // Wait for typing indicator
    await this.typingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    
    // Wait for bot response
    await this.typingIndicator.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
    
    // Verify response arrived
    await expect(this.messagesList).toHaveCount(currentMessagesCount + 2, { timeout: 60000 });
  }

  /**
   * Get all messages
   */
  async getMessages(): Promise<string[]> {
    const messages: string[] = [];
    const count = await this.messagesList.count();
    for (let i = 0; i < count; i++) {
      const text = await this.messagesList.nth(i).textContent();
      if (text) messages.push(text);
    }
    return messages;
  }

  /**
   * Get last message
   */
  async getLastMessage(): Promise<string> {
    return (await this.messagesList.last().textContent()) ?? '';
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return this.messagesList.count();
  }

  /**
   * Check if typing indicator is visible
   */
  async isTyping(): Promise<boolean> {
    return this.typingIndicator.isVisible();
  }

  /**
   * Open gift modal
   */
  async openGiftModal(): Promise<void> {
    await this.giftButton.click();
    await this.giftModal.waitFor({ state: 'visible' });
  }

  /**
   * Close gift modal
   */
  async closeGiftModalDialog(): Promise<void> {
    await this.closeGiftModal.click();
    await this.giftModal.waitFor({ state: 'hidden' });
  }

  /**
   * Send enter key in input
   */
  async pressEnterToSend(): Promise<void> {
    await this.messageInput.press('Enter');
  }

  /**
   * Open scene selector
   */
  async openSceneSelector(): Promise<void> {
    await this.sceneButton.click();
  }

  async verifyPageElements(): Promise<void> {
    await expect(this.messageInput).toBeVisible();
    await expect(this.sendButton).toBeVisible();
  }

  /**
   * Alias for typeMessage
   */
  async enterMessage(message: string): Promise<void> {
    await this.typeMessage(message);
  }

  /**
   * Alias for sendButton click
   */
  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  /**
   * Check if gift modal is visible
   */
  async isGiftModalVisible(): Promise<boolean> {
    return this.giftModal.isVisible();
  }

  /**
   * Open search (if available)
   */
  async openSearch(): Promise<void> {
    const searchButton = this.page.locator('button:has(svg.lucide-search)');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }
  }

  /**
   * Check if search is visible
   */
  async isSearchVisible(): Promise<boolean> {
    const searchInput = this.page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]');
    return searchInput.isVisible();
  }

  /**
   * Search in chat
   */
  async search(query: string): Promise<void> {
    const searchInput = this.page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]');
    await searchInput.fill(query);
  }
}
