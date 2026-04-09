import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * OnboardingPage - Page Object for Character Creation / Onboarding
 * Path: /onboarding
 */
export class OnboardingPage extends BasePage {
  readonly url = '/onboarding';

  // Step indicators
  readonly stepIndicator: Locator;
  readonly currentStep: Locator;

  // Step 1: Name
  readonly nameInput: Locator;

  // Step 2: Age
  readonly ageSlider: Locator;
  readonly ageValue: Locator;

  // Step 3: Occupation
  readonly occupationOptions: Locator;

  // Step 4: Personality
  readonly personalityOptions: Locator;

  // Navigation buttons
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly createButton: Locator;

  // Loading state
  readonly creatingLoader: Locator;

  constructor(page: Page) {
    super(page);
    
    this.stepIndicator = page.locator('[data-testid="step-indicator"]');
    this.currentStep = page.locator('[data-testid="current-step"]');

    // Step 1
    this.nameInput = page.locator('input[placeholder*="tên" i], input[name="name"]');

    // Step 2
    this.ageSlider = page.locator('input[type="range"]');
    this.ageValue = page.locator('[data-testid="age-value"]');

    // Step 3
    this.occupationOptions = page.locator('[data-testid="occupation-option"], button[data-occupation]');

    // Step 4
    this.personalityOptions = page.locator('[data-testid="personality-option"], button[data-personality]');

    // Navigation
    this.nextButton = page.locator('button:has-text("Tiếp"), button:has-text("Next"), button:has(svg.lucide-arrow-right)');
    this.backButton = page.locator('button:has-text("Quay lại"), button:has-text("Back")');
    this.createButton = page.locator('button:has-text("Tạo"), button:has-text("Create"), button:has-text("Hoàn tất")');

    this.creatingLoader = page.locator('.animate-spin');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.nextButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Enter character name
   */
  async enterName(name: string): Promise<void> {
    await this.fillInput(this.nameInput, name);
  }

  /**
   * Go to next step
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
    await this.page.waitForTimeout(500); // Animation
  }

  /**
   * Go back to previous step
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select occupation by value
   */
  async selectOccupation(occupation: string): Promise<void> {
    const option = this.page.locator(`[data-occupation="${occupation}"], button:has-text("${occupation}")`);
    await option.click();
  }

  /**
   * Select personality by value
   */
  async selectPersonality(personality: string): Promise<void> {
    const option = this.page.locator(`[data-personality="${personality}"], button:has-text("${personality}")`);
    await option.click();
  }

  /**
   * Set age with slider
   */
  async setAge(age: number): Promise<void> {
    // Range inputs don't support .fill() — must use evaluate to set value
    await this.ageSlider.evaluate((el, val) => {
      (el as HTMLInputElement).value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, age.toString());
  }

  /**
   * Click create button
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  /**
   * Complete full onboarding flow
   */
  async completeOnboarding(options: {
    name: string;
    age?: number;
    occupation?: string;
    personality?: string;
  }): Promise<void> {
    // Step 1: Name
    await this.enterName(options.name);
    await this.clickNext();

    // Step 2: Age
    if (options.age) {
      await this.setAge(options.age);
    }
    await this.clickNext();

    // Step 3: Occupation
    if (options.occupation) {
      await this.selectOccupation(options.occupation);
    }
    await this.clickNext();

    // Step 4: Personality
    if (options.personality) {
      await this.selectPersonality(options.personality);
    }

    // Create
    await this.clickCreate();
    
    // Wait for navigation to dashboard
    await this.waitForNavigation(/\/dashboard/);
  }

  async verifyPageElements(): Promise<void> {
    // Should have either name input or next button visible
    const hasNameInput = await this.nameInput.isVisible();
    const hasNextButton = await this.nextButton.isVisible();
    expect(hasNameInput || hasNextButton).toBeTruthy();
  }

  /**
   * Alias for nameInput - for character name
   */
  get characterNameInput(): Locator {
    return this.nameInput;
  }

  /**
   * Alias for enterName
   */
  async enterCharacterName(name: string): Promise<void> {
    await this.enterName(name);
  }

  /**
   * Get personality options list
   */
  async getPersonalityOptions(): Promise<string[]> {
    const options: string[] = [];
    const count = await this.personalityOptions.count();
    for (let i = 0; i < count; i++) {
      const text = await this.personalityOptions.nth(i).textContent();
      if (text) options.push(text.trim());
    }
    return options;
  }

  /**
   * Alias for completeOnboarding
   */
  async completeCharacterCreation(options: {
    name: string;
    age?: number;
    occupation?: string;
    personality?: string;
  }): Promise<void> {
    await this.completeOnboarding(options);
  }
}
