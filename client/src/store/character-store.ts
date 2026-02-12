import { create } from 'zustand';
import { api } from '@/services/api';

interface Character {
  id: string;
  name: string;
  nickname?: string;
  gender: 'MALE' | 'FEMALE';
  avatar?: string;
  bio?: string;
  personality: string;
  mood: string;
  level: number;
  experience: number;
  affection: number;
  relationshipStage: string;
  age: number;
  occupation: string;
  avatarStyle: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
}

interface MoodInfo {
  mood: string;
  moodScore: number;
  moodEmoji: string;
  description: string;
  factors: string[];
}

interface CharacterState {
  character: Character | null;
  isLoading: boolean;
  needsCreation: boolean;
  moodInfo: MoodInfo | null;

  // Actions
  setCharacter: (character: Character) => void;
  fetchCharacter: () => Promise<void>;
  createCharacter: (data: {
    name: string;
    gender?: 'MALE' | 'FEMALE';
    personality?: string;
    age?: number;
    occupation?: string;
  }) => Promise<void>;
  updateMood: (mood: string) => void;
  updateAffection: (change: number) => void;
  setAffection: (affection: number) => void;
  addExperience: (xp: number) => void;
  setMoodInfo: (info: MoodInfo) => void;
  clear: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,
  isLoading: true,
  needsCreation: false,
  moodInfo: null,

  setCharacter: (character: Character) => {
    set({ character, isLoading: false, needsCreation: false });
  },

  fetchCharacter: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get<Character>('/character');
      if (response.success && response.data) {
        set({ character: response.data, isLoading: false, needsCreation: false });
      } else {
        set({ isLoading: false, needsCreation: true, character: null });
      }
    } catch (error) {
      // If no character exists, need to create one
      const err = error as Error;
      if (err.message.includes('No active character') || err.message.includes('not found')) {
        set({ isLoading: false, needsCreation: true, character: null });
      } else {
        set({ isLoading: false });
      }
    }
  },

  createCharacter: async (data) => {
    try {
      set({ isLoading: true });
      const response = await api.post<Character>('/character', data);
      if (response.success && response.data) {
        set({ character: response.data, isLoading: false, needsCreation: false });
      }
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to create character');
    }
  },

  updateMood: (mood: string) => {
    set((state) => {
      if (!state.character) return state;
      return { character: { ...state.character, mood } };
    });
  },

  updateAffection: (change: number) => {
    set((state) => {
      if (!state.character) return state;
      const newAffection = Math.max(0, Math.min(1000, state.character.affection + change));
      return { character: { ...state.character, affection: newAffection } };
    });
  },

  // Set absolute affection value (used for cross-tab sync to prevent double updates)
  setAffection: (affection: number) => {
    set((state) => {
      if (!state.character) return state;
      const clampedAffection = Math.max(0, Math.min(1000, affection));
      return { character: { ...state.character, affection: clampedAffection } };
    });
  },

  addExperience: (xp: number) => {
    set((state) => {
      if (!state.character) return state;
      let newXp = state.character.experience + xp;
      let newLevel = state.character.level;

      // XP scaling formula matching backend: 100 + (level - 1) * 50
      let xpNeeded = 100 + (newLevel - 1) * 50;
      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        xpNeeded = 100 + (newLevel - 1) * 50;
      }

      return { character: { ...state.character, experience: newXp, level: newLevel } };
    });
  },

  setMoodInfo: (info: MoodInfo) => {
    set({ moodInfo: info });
  },

  clear: () => {
    set({ character: null, isLoading: true, needsCreation: false, moodInfo: null });
  },
}));
