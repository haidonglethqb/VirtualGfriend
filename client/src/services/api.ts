const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
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
      await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 5000)));
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
      throw new Error(data.error?.message || data.message || 'Request failed');
    }

    // Also check success field in response body (for 200 responses with success: false)
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
    this.refreshPromise = this.doRefreshToken().finally(() => {
      // Delay clearing so concurrent callers that arrive during the refresh
      // still receive the same promise instead of starting a new one
      setTimeout(() => { this.refreshPromise = null; }, 1000);
    });
    
    return this.refreshPromise;
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
