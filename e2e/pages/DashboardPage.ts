import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * DashboardPage - Page Object for the Dashboard page
 * Path: /dashboard
 */
export class DashboardPage extends BasePage {
  readonly url = '/dashboard';

  // Navigation elements
  readonly navHome: Locator;
  readonly navChat: Locator;
  readonly navQuests: Locator;
  readonly navShop: Locator;
  readonly navSettings: Locator;

  // Character info
  readonly characterName: Locator;
  readonly characterAvatar: Locator;
  readonly characterMood: Locator;
  readonly characterLevel: Locator;
  readonly affectionBar: Locator;
  readonly experienceBar: Locator;

  // Stats
  readonly coinsDisplay: Locator;
  readonly gemsDisplay: Locator;
  readonly streakDisplay: Locator;

  // Quick actions
  readonly chatButton: Locator;
  readonly giftButton: Locator;
  readonly questsSection: Locator;

  // Daily quests
  readonly dailyQuestsList: Locator;
  readonly questItem: Locator;

  // Create character button (if no character exists)
  readonly createCharacterButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // Navigation
    this.navHome = page.locator('a[href="/dashboard"], button:has-text("Home")');
    this.navChat = page.locator('a[href="/chat"]');
    this.navQuests = page.locator('a[href="/quests"]');
    this.navShop = page.locator('a[href="/shop"]');
    this.navSettings = page.locator('a[href="/settings"]');

    // Character info
    this.characterName = page.locator('[data-testid="character-name"], h2:first-of-type');
    this.characterAvatar = page.locator('[data-testid="character-avatar"], .character-avatar');
    this.characterMood = page.locator('[data-testid="character-mood"]');
    this.characterLevel = page.locator('[data-testid="character-level"]');
    this.affectionBar = page.locator('[data-testid="affection-bar"], .affection-progress');
    this.experienceBar = page.locator('[data-testid="experience-bar"], .experience-progress');

    // Stats
    this.coinsDisplay = page.locator('[data-testid="coins-display"]');
    this.gemsDisplay = page.locator('[data-testid="gems-display"]');
    this.streakDisplay = page.locator('[data-testid="streak-display"]');

    // Quick actions
    this.chatButton = page.locator('a[href="/chat"], button:has-text("Chat"), button:has-text("Trò chuyện")');
    this.giftButton = page.locator('button:has-text("Gift"), button:has-text("Tặng quà")');
    this.questsSection = page.locator('[data-testid="quests-section"]');

    // Daily quests
    this.dailyQuestsList = page.locator('[data-testid="daily-quests"]');
    this.questItem = page.locator('[data-testid="quest-item"]');

    // Create character
    this.createCharacterButton = page.locator('button:has-text("Tạo nhân vật"), button:has-text("Create Character")');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for either character info or create character button
    await Promise.race([
      this.characterName.waitFor({ state: 'visible', timeout: 15000 }),
      this.createCharacterButton.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});
    
    await this.waitForLoadingComplete();
  }

  /**
   * Check if character exists
   */
  async hasCharacter(): Promise<boolean> {
    return this.characterName.isVisible();
  }

  /**
   * Check if needs to create character
   */
  async needsCharacterCreation(): Promise<boolean> {
    return this.createCharacterButton.isVisible();
  }

  /**
   * Get character name
   */
  async getCharacterName(): Promise<string> {
    return (await this.characterName.textContent()) ?? '';
  }

  /**
   * Navigate to chat
   */
  async goToChat(): Promise<void> {
    await this.navChat.click();
    await this.waitForNavigation(/\/chat/);
  }

  /**
   * Navigate to quests
   */
  async goToQuests(): Promise<void> {
    await this.navQuests.click();
    await this.waitForNavigation(/\/quests/);
  }

  /**
   * Navigate to shop
   */
  async goToShop(): Promise<void> {
    await this.navShop.click();
    await this.waitForNavigation(/\/shop/);
  }

  /**
   * Navigate to settings
   */
  async goToSettings(): Promise<void> {
    await this.navSettings.click();
    await this.waitForNavigation(/\/settings/);
  }

  /**
   * Click create character button
   */
  async clickCreateCharacter(): Promise<void> {
    await this.createCharacterButton.click();
  }

  /**
   * Get number of visible daily quests
   */
  async getDailyQuestsCount(): Promise<number> {
    return this.questItem.count();
  }

  async verifyPageElements(): Promise<void> {
    // Should have either character info or create button
    const hasCharacter = await this.hasCharacter();
    const needsCreation = await this.needsCharacterCreation();
    expect(hasCharacter || needsCreation).toBeTruthy();
  }
}
