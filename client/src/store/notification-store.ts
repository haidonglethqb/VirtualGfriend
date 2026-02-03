import { create } from 'zustand'

interface AINotification {
  characterId: string
  message: string
  type: 'morning' | 'night' | 'miss_you' | 'birthday'
}

interface ProactiveNotification {
  characterId: string
  characterName: string
  type: 'morning_greeting' | 'night_greeting' | 'miss_you' | 'random_thought' | 'anniversary' | 'comeback_message'
  message: string
}

interface NotificationState {
  // Affection popup
  affectionChange: number
  showAffectionPopup: boolean
  
  // Level up modal
  showLevelUpModal: boolean
  newLevel: number
  levelUpUnlocks: string[]
  levelUpRewards?: { coins?: number; gems?: number; affection?: number }
  
  // Relationship upgrade modal
  showRelationshipModal: boolean
  previousStage: string
  newStage: string
  
  // AI proactive notification (legacy)
  aiNotification: AINotification | null
  showAINotificationToast: boolean

  // Proactive notification (new)
  proactiveNotification: ProactiveNotification | null

  // Actions
  showAffectionChange: (change: number) => void
  hideAffectionPopup: () => void
  showLevelUp: (level: number, unlocks: string[], rewards?: { coins?: number; gems?: number; affection?: number }) => void
  hideLevelUp: () => void
  showRelationshipUpgrade: (previousStage: string, newStage: string) => void
  hideRelationshipUpgrade: () => void
  showAINotification: (data: AINotification) => void
  hideAINotification: () => void
  showProactiveNotification: (data: ProactiveNotification) => void
  hideProactiveNotification: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  // Initial state
  affectionChange: 0,
  showAffectionPopup: false,
  showLevelUpModal: false,
  newLevel: 1,
  levelUpUnlocks: [],
  levelUpRewards: undefined,
  showRelationshipModal: false,
  previousStage: 'STRANGER',
  newStage: 'ACQUAINTANCE',
  aiNotification: null,
  showAINotificationToast: false,
  proactiveNotification: null,

  // Actions
  showAffectionChange: (change: number) => {
    set({ affectionChange: change, showAffectionPopup: true })
    // Auto-hide after 2 seconds
    setTimeout(() => {
      set({ showAffectionPopup: false })
    }, 2000)
  },

  hideAffectionPopup: () => {
    set({ showAffectionPopup: false })
  },

  showLevelUp: (level: number, unlocks: string[], rewards?: { coins?: number; gems?: number; affection?: number }) => {
    set({ 
      showLevelUpModal: true, 
      newLevel: level,
      levelUpUnlocks: unlocks,
      levelUpRewards: rewards
    })
  },

  hideLevelUp: () => {
    set({ showLevelUpModal: false })
  },

  showRelationshipUpgrade: (previousStage: string, newStage: string) => {
    set({
      showRelationshipModal: true,
      previousStage,
      newStage
    })
  },

  hideRelationshipUpgrade: () => {
    set({ showRelationshipModal: false })
  },

  showAINotification: (data: AINotification) => {
    set({ aiNotification: data, showAINotificationToast: true })
  },

  hideAINotification: () => {
    set({ showAINotificationToast: false, aiNotification: null })
  },

  showProactiveNotification: (data: ProactiveNotification) => {
    set({ proactiveNotification: data })
  },

  hideProactiveNotification: () => {
    set({ proactiveNotification: null })
  },
}))
