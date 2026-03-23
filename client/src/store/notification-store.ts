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

interface QuestCompletedNotification {
  questId: string
  questName: string
  rewards: {
    coins?: number
    gems?: number
    xp?: number
    affection?: number
  }
}

interface MilestoneNotification {
  milestoneId: string
  milestoneName: string
  description?: string
  rewards?: {
    coins?: number
    gems?: number
  }
}

interface GeneralNotification {
  type: string
  title: string
  message: string
  durationMs?: number
  data?: Record<string, unknown>
}

const DEFAULT_GENERAL_NOTIFICATION_DURATION_MS = 5000
const MIN_GENERAL_NOTIFICATION_DURATION_MS = 1000
const MAX_GENERAL_NOTIFICATION_DURATION_MS = 60000
let generalNotificationTimeout: ReturnType<typeof setTimeout> | null = null

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

  // Quest completed notification
  questCompleted: QuestCompletedNotification | null
  showQuestCompletedModal: boolean

  // Milestone unlocked notification
  milestoneUnlocked: MilestoneNotification | null
  showMilestoneModal: boolean

  // General notification
  generalNotification: GeneralNotification | null

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
  showQuestCompleted: (data: QuestCompletedNotification) => void
  hideQuestCompleted: () => void
  showMilestoneUnlocked: (data: MilestoneNotification) => void
  hideMilestoneUnlocked: () => void
  showGeneralNotification: (data: GeneralNotification) => void
  hideGeneralNotification: () => void
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
  questCompleted: null,
  showQuestCompletedModal: false,
  milestoneUnlocked: null,
  showMilestoneModal: false,
  generalNotification: null,

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

  showQuestCompleted: (data: QuestCompletedNotification) => {
    set({ questCompleted: data, showQuestCompletedModal: true })
  },

  hideQuestCompleted: () => {
    set({ showQuestCompletedModal: false, questCompleted: null })
  },

  showMilestoneUnlocked: (data: MilestoneNotification) => {
    set({ milestoneUnlocked: data, showMilestoneModal: true })
  },

  hideMilestoneUnlocked: () => {
    set({ showMilestoneModal: false, milestoneUnlocked: null })
  },

  showGeneralNotification: (data: GeneralNotification) => {
    if (generalNotificationTimeout) {
      clearTimeout(generalNotificationTimeout)
      generalNotificationTimeout = null
    }

    const requestedDuration = Number(data.durationMs)
    const durationMs = Number.isFinite(requestedDuration)
      ? Math.min(MAX_GENERAL_NOTIFICATION_DURATION_MS, Math.max(MIN_GENERAL_NOTIFICATION_DURATION_MS, requestedDuration))
      : DEFAULT_GENERAL_NOTIFICATION_DURATION_MS

    set({ generalNotification: data })
    generalNotificationTimeout = setTimeout(() => {
      set({ generalNotification: null })
      generalNotificationTimeout = null
    }, durationMs)
  },

  hideGeneralNotification: () => {
    if (generalNotificationTimeout) {
      clearTimeout(generalNotificationTimeout)
      generalNotificationTimeout = null
    }
    set({ generalNotification: null })
  },
}))
