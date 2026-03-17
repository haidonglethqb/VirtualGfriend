import { create } from 'zustand';
import api from '@/services/api';
import { AllTierConfigs, PREMIUM_FEATURES } from '@/lib/premium';

interface PremiumStoreState {
  allTierConfigs: AllTierConfigs;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchTierConfigs: (force?: boolean) => Promise<AllTierConfigs>;
  invalidateTierConfigs: () => void;
  setTierConfigs: (configs: AllTierConfigs) => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

export const usePremiumStore = create<PremiumStoreState>((set, get) => ({
  allTierConfigs: PREMIUM_FEATURES,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  setTierConfigs: (configs) => {
    set({ allTierConfigs: configs, error: null, lastFetchedAt: Date.now() });
  },

  invalidateTierConfigs: () => {
    set({ lastFetchedAt: null });
  },

  fetchTierConfigs: async (force = false) => {
    const { allTierConfigs, lastFetchedAt, isLoading } = get();

    if (isLoading) {
      return allTierConfigs;
    }

    const isCacheValid =
      !force &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < CACHE_TTL_MS;

    if (isCacheValid) {
      return allTierConfigs;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await api.get<AllTierConfigs>('/config/tier-plans');
      if (!response.success || !response.data) {
        throw new Error('Khong the tai cau hinh goi VIP');
      }

      set({
        allTierConfigs: response.data,
        isLoading: false,
        error: null,
        lastFetchedAt: Date.now(),
      });

      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Khong the tai cau hinh goi VIP';
      set({
        isLoading: false,
        error: message,
      });
      return allTierConfigs;
    }
  },
}));
