import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';
import { useChatStore } from './chat-store';
import { useCharacterStore } from './character-store';

interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  isPremium: boolean;
  coins: number;
  gems: number;
  streak?: number;
}

interface AuthResponseData {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  checkAuth: () => Promise<void>;
  updateBalance: (coins?: number, gems?: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        const response = await api.post<AuthResponseData>('/auth/login', { email, password });
        if (response.success && response.data) {
          const { user, tokens } = response.data;
          set({
            user,
            accessToken: tokens.accessToken,
            isAuthenticated: true,
          });
        }
      },

      register: async (email: string, password: string, username?: string) => {
        const response = await api.post<AuthResponseData>('/auth/register', { email, password, username });
        if (response.success && response.data) {
          const { user, tokens } = response.data;
          set({
            user,
            accessToken: tokens.accessToken,
            isAuthenticated: true,
          });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore errors
        }
        
        // Clear all user-scoped stores
        useChatStore.getState().clearMessages();
        useCharacterStore.getState().clear();
        
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      refreshToken: async () => {
        try {
          const response = await api.post<AuthResponseData>('/auth/refresh');
          if (response.success && response.data) {
            const { user, tokens } = response.data;
            set({
              user,
              accessToken: tokens.accessToken,
              isAuthenticated: true,
            });
          }
        } catch {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setAccessToken: (token: string) => {
        set({ accessToken: token, isAuthenticated: true });
      },

      checkAuth: async () => {
        const token = get().accessToken;
        
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get<User>('/auth/me');
          if (response.success && response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch {
          // Try to refresh token
          try {
            await get().refreshToken();
            set({ isLoading: false });
          } catch {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        }
      },

      updateBalance: (coins?: number, gems?: number) => {
        const user = get().user;
        if (!user) return;

        set({
          user: {
            ...user,
            coins: coins !== undefined ? coins : user.coins,
            gems: gems !== undefined ? gems : user.gems,
          },
        });
      },
    }),
    {
      name: 'vgfriend-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    }
  )
);

// Cross-tab sync: Listen for storage changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'vgfriend-auth' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        const newToken = parsed.state?.accessToken;
        const currentToken = useAuthStore.getState().accessToken;
        
        // If token changed, update the store
        if (newToken && newToken !== currentToken) {
          useAuthStore.setState({ 
            accessToken: newToken, 
            isAuthenticated: true 
          });
        } else if (!newToken && currentToken) {
          // Token was cleared (logout from another tab)
          useAuthStore.setState({
            accessToken: null,
            user: null,
            isAuthenticated: false,
          });
          useChatStore.getState().clearMessages();
          useCharacterStore.getState().clear();
        }
      } catch {
        // Ignore parse errors
      }
    }
  });
}
