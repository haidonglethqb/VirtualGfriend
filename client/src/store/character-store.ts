import { create } from 'zustand';
import { api } from '@/services/api';

const SELECTED_CHARACTER_KEY = 'vgfriend:selected-character-id';

// Rank titles mirroring server LEVEL_RANKS
const LEVEL_RANKS = [
  { maxLevel: 4, title: 'Người lạ' },
  { maxLevel: 9, title: 'Quen biết' },
  { maxLevel: 14, title: 'Bạn thân' },
  { maxLevel: 19, title: 'Tri kỷ' },
  { maxLevel: 24, title: 'Người thương' },
  { maxLevel: 29, title: 'Tình nhân' },
  { maxLevel: 39, title: 'Đồng hành' },
  { maxLevel: 49, title: 'Linh hồn đôi' },
  { maxLevel: 50, title: 'Huyền thoại tình yêu' },
];

export function getRankTitle(level: number): string {
  for (const rank of LEVEL_RANKS) {
    if (level <= rank.maxLevel) return rank.title;
  }
  return LEVEL_RANKS[LEVEL_RANKS.length - 1].title;
}

export function getXpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export function getXpProgress(level: number, experience: number) {
  const xpNeeded = getXpRequiredForLevel(level);
  return {
    current: experience,
    needed: xpNeeded,
    percent: Math.min(100, Math.round((experience / xpNeeded) * 100)),
  };
}

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
  personality: string;
  style: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface ActiveCharacter {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
  mood: string;
  affection: number;
  level: number;
  experience: number;
  relationshipStage: string;
  age?: number;
  occupation?: string;
  isActive?: boolean;
  isEnded?: boolean;
  isExPersona?: boolean;
  relationshipState?: 'ACTIVE' | 'ENDED' | string;
  canChatEx?: boolean;
  canGiftEx?: boolean;
  requiredTier?: 'BASIC' | 'PRO' | 'ULTIMATE' | null;
  lockReason?: string | null;
  stats?: {
    messages: number;
    gifts: number;
    memories: number;
  };
}

export interface Character extends ActiveCharacter {
  nickname?: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
  templateId?: string;
  template?: CharacterTemplate;
  bio?: string;
  personality: string;
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
  selectedCharacter: Character | null;
  characters: ActiveCharacter[];
  selectedCharacterId: string | null;
  isLoading: boolean;
  needsCreation: boolean;
  moodInfo: MoodInfo | null;

  // Actions
  setCharacter: (character: Character) => void;
  setCharacters: (characters: ActiveCharacter[]) => void;
  setSelectedCharacterId: (characterId: string | null) => void;
  fetchCharacter: (characterId?: string) => Promise<void>;
  createCharacter: (data: {
    name: string;
    gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
    personality?: string;
    age?: number;
    occupation?: string;
    templateId?: string;
    avatarUrl?: string;
  }) => Promise<Character>;
  updateMood: (mood: string) => void;
  updateAffection: (change: number) => void;
  setAffection: (affection: number) => void;
  addExperience: (xp: number) => void;
  setMoodInfo: (info: MoodInfo) => void;
  clear: () => void;
}

function persistSelectedCharacterId(characterId: string | null) {
  if (typeof window === 'undefined') return;
  if (!characterId) {
    localStorage.removeItem(SELECTED_CHARACTER_KEY);
    return;
  }
  localStorage.setItem(SELECTED_CHARACTER_KEY, characterId);
}

function loadPersistedSelectedCharacterId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_CHARACTER_KEY);
}

function mergeSelectedIntoList(
  characters: ActiveCharacter[],
  selectedCharacter: Character | null
): ActiveCharacter[] {
  if (!selectedCharacter) return characters;
  return characters.map((item) => item.id === selectedCharacter.id
    ? {
      ...item,
      name: selectedCharacter.name,
      avatarUrl: selectedCharacter.avatarUrl || item.avatarUrl,
      mood: selectedCharacter.mood,
      affection: selectedCharacter.affection,
      level: selectedCharacter.level,
      experience: selectedCharacter.experience,
      relationshipStage: selectedCharacter.relationshipStage,
      age: selectedCharacter.age,
      occupation: selectedCharacter.occupation,
    }
    : item);
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  selectedCharacter: null,
  characters: [],
  selectedCharacterId: null,
  isLoading: true,
  needsCreation: false,
  moodInfo: null,

  setCharacter: (character: Character) => {
    const currentCharacters = get().characters;
    const mergedCharacters = mergeSelectedIntoList(currentCharacters, character);
    const hasCharacter = mergedCharacters.some((item) => item.id === character.id);
    const finalCharacters = hasCharacter
      ? mergedCharacters
      : [
        {
          id: character.id,
          name: character.name,
          avatar: character.avatar,
          avatarUrl: character.avatarUrl,
          mood: character.mood,
          affection: character.affection,
          level: character.level,
          experience: character.experience,
          relationshipStage: character.relationshipStage,
          age: character.age,
          occupation: character.occupation,
        },
        ...mergedCharacters,
      ];

    set({
      character,
      selectedCharacter: character,
      selectedCharacterId: character.id,
      characters: finalCharacters,
      isLoading: false,
      needsCreation: false,
    });
    persistSelectedCharacterId(character.id);
  },

  setCharacters: (characters: ActiveCharacter[]) => {
    const selectedCharacter = get().selectedCharacter;
    set({
      characters: mergeSelectedIntoList(characters, selectedCharacter),
    });
  },

  setSelectedCharacterId: (characterId: string | null) => {
    set({
      selectedCharacterId: characterId,
    });
    persistSelectedCharacterId(characterId);
  },

  fetchCharacter: async (characterId?: string) => {
    try {
      set({ isLoading: true });
      const activeResponse = await api.get<ActiveCharacter[]>('/character/active');
      const activeCharacters = activeResponse.success ? (activeResponse.data || []) : [];
      const currentSelected = get().selectedCharacterId;
      const persistedSelected = loadPersistedSelectedCharacterId();
      const requestedId = characterId || currentSelected || persistedSelected;

      if (activeCharacters.length === 0 && !characterId) {
        set({
          character: null,
          selectedCharacter: null,
          characters: [],
          selectedCharacterId: null,
          isLoading: false,
          needsCreation: true,
        });
        persistSelectedCharacterId(null);
        return;
      }

      const exists = requestedId ? activeCharacters.some((item) => item.id === requestedId) : false;
      const effectiveCharacterId = characterId || (exists && requestedId ? requestedId : activeCharacters[0]?.id);

      if (!effectiveCharacterId) {
        set({
          character: null,
          selectedCharacter: null,
          characters: [],
          selectedCharacterId: null,
          isLoading: false,
          needsCreation: true,
        });
        persistSelectedCharacterId(null);
        return;
      }

      const characterResponse = await api.get<Character>(`/character?characterId=${encodeURIComponent(effectiveCharacterId)}`);
      if (!characterResponse.success || !characterResponse.data) {
        throw new Error('Character load failed');
      }

      const selectedCharacter = characterResponse.data;
      const selectedIsActive = activeCharacters.some((item) => item.id === selectedCharacter.id);
      const mergedCharacters = selectedIsActive
        ? mergeSelectedIntoList(activeCharacters, selectedCharacter)
        : activeCharacters;
      set({
        character: selectedCharacter,
        selectedCharacter,
        selectedCharacterId: selectedCharacter.id,
        characters: mergedCharacters,
        isLoading: false,
        needsCreation: false,
      });
      persistSelectedCharacterId(selectedCharacter.id);
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('No active character') || err.message.includes('not found')) {
        set({
          character: null,
          selectedCharacter: null,
          characters: [],
          selectedCharacterId: null,
          isLoading: false,
          needsCreation: true,
        });
        persistSelectedCharacterId(null);
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
        await get().fetchCharacter(response.data.id);
        const freshCharacter = get().character;
        if (!freshCharacter) {
          throw new Error('Character creation failed');
        }
        return freshCharacter;
      }
      throw new Error('Character creation failed');
    } catch (error) {
      set({ isLoading: false });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create character');
    }
  },

  updateMood: (mood: string) => {
    set((state) => {
      if (!state.character) return state;
      const nextCharacter = { ...state.character, mood };
      return {
        character: nextCharacter,
        selectedCharacter: nextCharacter,
        characters: state.characters.map((item) => item.id === nextCharacter.id ? { ...item, mood } : item),
      };
    });
  },

  updateAffection: (change: number) => {
    set((state) => {
      if (!state.character) return state;
      const newAffection = Math.max(0, Math.min(1000, state.character.affection + change));
      const nextCharacter = { ...state.character, affection: newAffection };
      return {
        character: nextCharacter,
        selectedCharacter: nextCharacter,
        characters: state.characters.map((item) => item.id === nextCharacter.id ? { ...item, affection: newAffection } : item),
      };
    });
  },

  // Set absolute affection value (used for cross-tab sync to prevent double updates)
  setAffection: (affection: number) => {
    set((state) => {
      if (!state.character) return state;
      const clampedAffection = Math.max(0, Math.min(1000, affection));
      const nextCharacter = { ...state.character, affection: clampedAffection };
      return {
        character: nextCharacter,
        selectedCharacter: nextCharacter,
        characters: state.characters.map((item) => item.id === nextCharacter.id ? { ...item, affection: clampedAffection } : item),
      };
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

      const nextCharacter = { ...state.character, experience: newXp, level: newLevel };
      return {
        character: nextCharacter,
        selectedCharacter: nextCharacter,
        characters: state.characters.map((item) => item.id === nextCharacter.id
          ? { ...item, level: newLevel, experience: newXp }
          : item),
      };
    });
  },

  setMoodInfo: (info: MoodInfo) => {
    set({ moodInfo: info });
  },

  clear: () => {
    set({
      character: null,
      selectedCharacter: null,
      characters: [],
      selectedCharacterId: null,
      isLoading: true,
      needsCreation: false,
      moodInfo: null,
    });
    persistSelectedCharacterId(null);
  },
}));
