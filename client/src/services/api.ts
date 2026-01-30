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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.error?.message || error.message || 'Request failed');
    }

    const data: ApiResponse<T> = await response.json();
    return data;
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
