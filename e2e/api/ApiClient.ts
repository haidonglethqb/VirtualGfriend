import { APIRequestContext, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

/**
 * API Client for making direct API calls in tests
 */
export class ApiClient {
  private request: APIRequestContext;
  private baseUrl: string;
  private accessToken?: string;

  constructor(request: APIRequestContext, baseUrl: string = API_BASE_URL) {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Clear access token
   */
  clearAccessToken(): void {
    this.accessToken = undefined;
  }

  /**
   * Get headers with optional auth token
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Playwright-Test': 'true', // Skip rate limiting for E2E tests
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Register a new user
   */
  async register(email: string, password: string, username?: string) {
    const response = await this.request.post(`${this.baseUrl}/auth/register`, {
      data: { email, password, username },
      headers: this.getHeaders(),
    });
    const data = await response.json();
    // Auto-set token after successful registration
    const accessToken = data.data?.tokens?.accessToken || data.data?.accessToken;
    if (data.success && accessToken) {
      this.setAccessToken(accessToken);
    }
    return { response, data };
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    const response = await this.request.post(`${this.baseUrl}/auth/login`, {
      data: { email, password },
      headers: this.getHeaders(),
    });
    const data = await response.json();
    // Handle both old and new response formats
    const accessToken = data.data?.tokens?.accessToken || data.data?.accessToken;
    if (data.success && accessToken) {
      this.setAccessToken(accessToken);
    }
    return { response, data };
  }

  /**
   * Get current user info
   */
  async getMe() {
    const response = await this.request.get(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Logout user
   */
  async logout() {
    const response = await this.request.post(`${this.baseUrl}/auth/logout`, {
      headers: this.getHeaders(),
    });
    this.clearAccessToken();
    return { response, data: await response.json() };
  }

  /**
   * Forgot password - request OTP
   */
  async forgotPassword(email: string) {
    const response = await this.request.post(`${this.baseUrl}/auth/forgot-password`, {
      data: { email },
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string) {
    const response = await this.request.post(`${this.baseUrl}/auth/verify-otp`, {
      data: { email, otp },
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, token: string, newPassword: string) {
    const response = await this.request.post(`${this.baseUrl}/auth/reset-password`, {
      data: { email, token, newPassword },
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  // ==================== CHARACTER ENDPOINTS ====================

  /**
   * Get current user's character
   */
  async getCharacter() {
    const response = await this.request.get(`${this.baseUrl}/character`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Create a new character
   */
  async createCharacter(data: {
    name: string;
    gender?: 'MALE' | 'FEMALE';
    personality?: string;
    age?: number;
    occupation?: string;
  }) {
    const response = await this.request.post(`${this.baseUrl}/character`, {
      data,
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Update character
   */
  async updateCharacter(data: Partial<{
    name: string;
    nickname: string;
    personality: string;
    mood: string;
  }>) {
    const response = await this.request.patch(`${this.baseUrl}/character`, {
      data,
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  // ==================== CHAT ENDPOINTS ====================

  /**
   * Get chat history
   */
  async getChatHistory(options?: { page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/chat/history?${queryString}` 
      : `${this.baseUrl}/chat/history`;
    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Send a chat message
   */
  async sendMessage(content: string) {
    const response = await this.request.post(`${this.baseUrl}/chat/send`, {
      data: { content },
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Search messages
   */
  async searchMessages(query: string) {
    const response = await this.request.get(`${this.baseUrl}/chat/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Search chat history (alias for searchMessages)
   */
  async searchChatHistory(query: string) {
    return this.searchMessages(query);
  }

  // ==================== QUEST ENDPOINTS ====================

  /**
   * Get all quests
   */
  async getQuests() {
    const response = await this.request.get(`${this.baseUrl}/quests`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Get daily quests
   */
  async getDailyQuests() {
    const response = await this.request.get(`${this.baseUrl}/quests/daily`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Start a quest
   */
  async startQuest(questId: string) {
    const response = await this.request.post(`${this.baseUrl}/quests/start/${questId}`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Claim quest reward
   */
  async claimQuestReward(questId: string) {
    const response = await this.request.post(`${this.baseUrl}/quests/claim/${questId}`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  // ==================== GIFT ENDPOINTS ====================

  /**
   * Get available gifts
   */
  async getGifts() {
    const response = await this.request.get(`${this.baseUrl}/gifts`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Get user inventory
   */
  async getInventory() {
    const response = await this.request.get(`${this.baseUrl}/gifts/inventory`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Send a gift
   */
  async sendGift(giftId: string, characterId?: string) {
    const response = await this.request.post(`${this.baseUrl}/gifts/send`, {
      data: { giftId, characterId },
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  // ==================== SCENE ENDPOINTS ====================

  /**
   * Get all scenes
   */
  async getScenes() {
    const response = await this.request.get(`${this.baseUrl}/scenes`, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  /**
   * Set active scene
   */
  async setActiveScene(sceneId: string) {
    const response = await this.request.post(`${this.baseUrl}/scenes/active`, {
      data: { sceneId },
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  // ==================== MEMORY ENDPOINTS ====================

  /**
   * Get memories
   */
  async getMemories(limit?: number) {
    const url = limit 
      ? `${this.baseUrl}/memories?limit=${limit}` 
      : `${this.baseUrl}/memories`;
    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });
    return { response, data: await response.json() };
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Health check
   */
  async healthCheck() {
    const response = await this.request.get(this.baseUrl.replace('/api', '/health'));
    return { response, data: await response.json() };
  }

  /**
   * Get API info
   */
  async getApiInfo() {
    const response = await this.request.get(this.baseUrl);
    return { response, data: await response.json() };
  }
}
