import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export interface Scene {
  id: string;
  name: string;
  description: string;
  category: string; // indoor, outdoor, romantic, adventure
  imageUrl: string;
  ambiance: string;
  unlockMethod: string; // level, purchase, quest, event
  unlockValue: number;
  priceGems: number;
  isDefault: boolean;
  isUnlocked?: boolean;
}

interface SceneState {
  scenes: Scene[];
  activeSceneId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchScenes: () => Promise<void>;
  setActiveScene: (sceneId: string) => Promise<void>;
  unlockScene: (sceneId: string) => Promise<{ success: boolean; error?: string }>;
  getActiveScene: () => Scene | null;
}

export const useSceneStore = create<SceneState>()(
  persist(
    (set, get) => ({
      scenes: [],
      activeSceneId: null,
      isLoading: false,
      error: null,

      fetchScenes: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get<Scene[]>('/scenes');
          set({
            scenes: response.data,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load scenes',
            isLoading: false,
          });
        }
      },

      setActiveScene: async (sceneId: string) => {
        const scene = get().scenes.find(s => s.id === sceneId);
        if (!scene || (!scene.isUnlocked && !scene.isDefault)) {
          set({ error: 'Scene not available' });
          return;
        }

        try {
          await api.post(`/scenes/set-active/${sceneId}`);
          set({ activeSceneId: sceneId });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to set active scene' });
        }
      },

      unlockScene: async (sceneId: string) => {
        try {
          const response = await api.post<{ scene: Scene; unlocked: boolean }>(`/scenes/unlock/${sceneId}`);
          
          // Update scenes list
          set(state => ({
            scenes: state.scenes.map(s => 
              s.id === sceneId ? { ...s, isUnlocked: true } : s
            ),
          }));

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to unlock scene',
          };
        }
      },

      getActiveScene: () => {
        const { scenes, activeSceneId } = get();
        if (!activeSceneId) {
          // Return default scene
          return scenes.find(s => s.isDefault) || null;
        }
        return scenes.find(s => s.id === activeSceneId) || null;
      },
    }),
    {
      name: 'vgfriend-scene',
      partialize: (state) => ({
        activeSceneId: state.activeSceneId,
      }),
    }
  )
);

export default useSceneStore;
