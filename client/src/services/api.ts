const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

interface FormRequestOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  body: FormData;
  headers?: Record<string, string>;
}

// Common API response type
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
  };
  quota?: unknown;
}

export class ApiError extends Error {
  code?: string;
  status: number;
  quota?: unknown;

  constructor(message: string, status: number, code?: string, quota?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.quota = quota;
  }
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;
  private tokenSyncChannel: BroadcastChannel | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.initTokenSync();
  }

  // Listen for token updates from other tabs
  private initTokenSync() {
    if (typeof window === 'undefined') return;
    try {
      this.tokenSyncChannel = new BroadcastChannel('vgfriend-token-sync');
      this.tokenSyncChannel.onmessage = (event) => {
        if (event.data?.type === 'token-updated' && event.data?.accessToken) {
          // Update localStorage with new token from another tab
          const stored = localStorage.getItem('vgfriend-auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.state.accessToken = event.data.accessToken;
            if (event.data.user) parsed.state.user = event.data.user;
            localStorage.setItem('vgfriend-auth', JSON.stringify(parsed));
          }
        }
      };
    } catch {
      // BroadcastChannel not supported
    }
  }

  private broadcastTokenUpdate(accessToken: string, user?: unknown) {
    try {
      this.tokenSyncChannel?.postMessage({
        type: 'token-updated',
        accessToken,
        user,
      });
    } catch {
      // Ignore broadcast errors
    }
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('vgfriend-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.accessToken || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;
    
    const token = this.getAccessToken();
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      credentials: 'include',
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    // Handle 429 — rate limited, wait and retry once
    if (response.status === 429 && !options.headers?.['X-Rate-Retry']) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
      await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 10000)));
      return this.request<T>(endpoint, {
        ...options,
        headers: { ...headers, 'X-Rate-Retry': '1' },
      });
    }

    // Handle 401 — try refreshing the token once
    if (response.status === 401 && token && !options.headers?.['X-Retry']) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, {
          ...options,
          headers: { ...headers, 'X-Retry': '1' },
        });
      }
      // Refresh failed — force logout to stop the retry loop
      try {
        const { useAuthStore } = await import('../store/auth-store');
        await useAuthStore.getState().logout();
      } catch {
        // Fallback: clear storage manually
        localStorage.removeItem('vgfriend-auth');
        window.location.href = '/auth/login';
      }
    }

    // Safely parse JSON (server might return HTML on 502/503)
    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server error (${response.status})`);
    }

    // Check if response is not ok, throw with backend message
    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        response.status,
        data.error?.code,
        data.quota,
      );
    }

    // Also check success field in response body (for 200 responses with success: false)
    if ('success' in data && !data.success) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  private async formRequest<T>(endpoint: string, options: FormRequestOptions): Promise<ApiResponse<T>> {
    const { method = 'POST', body, headers = {} } = options;
    const token = this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      credentials: 'include',
      body,
    });

    if (response.status === 401 && token && !headers['X-Retry']) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.formRequest<T>(endpoint, {
          ...options,
          headers: { ...headers, 'X-Retry': '1' },
        });
      }
    }

    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server error (${response.status})`);
    }

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        response.status,
        data.error?.code,
        data.quota,
      );
    }

    if ('success' in data && !data.success) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start the refresh and save the promise
    this.refreshPromise = this.doRefreshToken();
    
    try {
      return await this.refreshPromise;
    } finally {
      // Clear the promise after completion (allow future refreshes)
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.data?.tokens?.accessToken) {
        const newToken = data.data.tokens.accessToken;
        const newUser = data.data.user;

        // Update Zustand persisted store in localStorage
        const stored = localStorage.getItem('vgfriend-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.state.accessToken = newToken;
          if (newUser) parsed.state.user = newUser;
          localStorage.setItem('vgfriend-auth', JSON.stringify(parsed));
        }

        // Notify Zustand store immediately to prevent stale token issues
        try {
          const { useAuthStore } = await import('../store/auth-store');
          useAuthStore.getState().setAccessToken(newToken);
        } catch {
          // Store update failed, continue anyway
        }

        // Broadcast to other tabs so they get the new token immediately
        this.broadcastTokenUpdate(newToken, newUser);

        return true;
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  get<T = unknown>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T = unknown>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  postForm<T = unknown>(endpoint: string, body: FormData) {
    return this.formRequest<T>(endpoint, { method: 'POST', body });
  }

  put<T = unknown>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  patch<T = unknown>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T = unknown>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(`${API_URL}/api`);
export default api;

export interface ArcQuestProgress {
  id: string;
  progress: number;
  maxProgress: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';
  completed: boolean;
  claimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
}

export interface ArcQuest {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  requirements: {
    action?: string;
    count?: number;
  };
  sortOrder: number;
  prerequisiteQuestId: string | null;
  isArcFinalQuest: boolean;
  rewardXp: number;
  rewardCoins: number;
  rewardGems: number;
  rewardAffection: number;
  target: number;
  userProgress: ArcQuestProgress | null;
  requirementText: LocalizedText;
  guidanceText: LocalizedText;
  progressText: LocalizedText;
  remaining: number;
  cta: {
    label: LocalizedText;
    href: string;
    disabled: boolean;
  };
  ctaLabel: LocalizedText;
  ctaHref: string;
  ctaDisabled: boolean;
  lockReason: 'START_ARC_FIRST' | 'COMPLETE_PREVIOUS_QUEST' | null;
  statusReason: 'START_ARC_FIRST' | 'COMPLETE_PREVIOUS_QUEST' | null;
  isCurrentQuest: boolean;
}

export interface LocalizedText {
  vi: string;
  en: string;
}

export type PremiumTierName = 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE';
export type VipGiftSegment = Exclude<PremiumTierName, 'FREE'>;

export interface GiftCatalogItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  imageUrl?: string;
  category: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  requiresPremium: boolean;
  minimumTier: PremiumTierName;
  requiredTier: PremiumTierName;
  isLocked: boolean;
  canBuy: boolean;
  lockReason: 'VIP_REQUIRED' | 'TIER_REQUIRED' | null;
  priceCoins: number;
  priceGems: number;
  affectionBonus: number;
}

export interface VipPackPreviewItem {
  segment: VipGiftSegment;
  config?: {
    id: string | null;
    displayName: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
  } | null;
  items: Array<{
    gift: GiftCatalogItem;
    quantity: number;
  }>;
  quantity: number;
  gift: GiftCatalogItem | null;
  warnings?: Array<{ segment: VipGiftSegment; code: string; message: string }>;
  isClaimable: boolean;
  claimedAt: string | null;
}

export interface VipGiftPackStatus {
  tier: PremiumTierName;
  isEligible: boolean;
  canClaim: boolean;
  claimMonth: string;
  eligibleSegments: VipGiftSegment[];
  claimedSegments: VipGiftSegment[];
  claimableSegments: VipGiftSegment[];
  nextClaimAt: string;
  secondsUntilNextClaim: number;
  lockReason: 'VIP_REQUIRED' | null;
  configWarnings?: Array<{ segment: VipGiftSegment; code: string; message: string }>;
  packPreview: VipPackPreviewItem[];
}

export interface VipGiftPackClaimResult {
  claimed: boolean;
  tier: PremiumTierName;
  claimMonth: string;
  claimedSegments: VipGiftSegment[];
  granted: Array<{
    segment: VipGiftSegment;
    quantity: number;
    gift: GiftCatalogItem;
  }>;
}

export interface ArcRewardSummary {
  coins: number;
  gems: number;
  xp: number;
  affection: number;
  titleName: string | null;
  sceneName: string | null;
}

export interface ArcSummary {
  id: string;
  name: string;
  description: string;
  iconEmoji: string;
  minLevel: number;
  maxLevel: number;
  requiredTier: string;
  backgroundImage: string | null;
  orderIndex: number;
  prerequisiteArcId: string | null;
  completionPercent: number;
  completedAt: string | null;
  unlockedAt: string | null;
  isUnlocked: boolean;
  lockReason: 'tier' | 'prerequisite' | null;
  totalQuests: number;
  completedQuests: number;
  rewards: ArcRewardSummary;
  quests: ArcQuest[];
}

export interface ArcDetail extends ArcSummary {
  isStarted: boolean;
  finalQuestId: string | null;
  canClaimArc: boolean;
}

export interface ArcClaimResult {
  claimed: boolean;
  arcProgress?: unknown;
  progress?: unknown;
  rewards: {
    coins: number;
    gems: number;
    xp: number;
    affection: number;
    title?: unknown;
    scene?: unknown;
  };
}

export const arcApi = {
  async getArcs() {
    return api.get<ArcSummary[]>('/arcs');
  },
  async getArcDetail(arcId: string) {
    return api.get<ArcDetail>(`/arcs/${arcId}`);
  },
  async startArc(arcId: string) {
    return api.post<ArcDetail>(`/arcs/${arcId}/start`);
  },
  async claimArcCompletion(arcId: string) {
    return api.post<ArcClaimResult>(`/arcs/${arcId}/claim`);
  },
  async claimArcQuestReward(arcId: string, questId: string) {
    return api.post<ArcClaimResult>(`/arcs/${arcId}/quests/${questId}/claim`);
  },
};
