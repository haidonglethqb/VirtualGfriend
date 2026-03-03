import { io, Socket } from 'socket.io-client'
import { useChatStore, Message } from '@/store/chat-store'
import { useCharacterStore } from '@/store/character-store'
import { useNotificationStore } from '@/store/notification-store'
import { crossTabSync } from './cross-tab-sync'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Store external listeners to re-register after reconnection
type EventCallback = (...args: unknown[]) => void
interface ExternalListener {
  event: string
  callback: EventCallback
}

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private socketId: string | null = null
  private currentToken: string | null = null
  private externalListeners: ExternalListener[] = []

  connect(token: string) {
    // If already connected with the same token, do nothing
    if (this.socket?.connected && this.currentToken === token) {
      return
    }

    // If connected with a different token, disconnect first
    if (this.socket && this.currentToken !== token) {
      this.socket.disconnect()
      this.socket = null
    }

    this.currentToken = token

    // Initialize cross-tab sync
    crossTabSync.initialize()

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    })

    this.setupEventHandlers()
    this.reRegisterExternalListeners()
  }

  // Reconnect with a new token (used after token refresh)
  reconnectWithNewToken(newToken: string) {
    if (this.currentToken === newToken) return
    
    this.currentToken = newToken
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.socket = io(WS_URL, {
      auth: { token: newToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    })

    this.setupEventHandlers()
    this.reRegisterExternalListeners()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      this.socketId = this.socket?.id || null
      useChatStore.getState().setConnected(true)
      this.reconnectAttempts = 0
      
      // On reconnect, fetch latest messages to ensure we're in sync
      useChatStore.getState().fetchMessages()
    })

    this.socket.on('disconnect', () => {
      useChatStore.getState().setConnected(false)
    })

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++
    })

    // Chat events - Socket.io room broadcast handles cross-tab sync
    // DO NOT broadcast via BroadcastChannel here - socket room already syncs all tabs
    this.socket.on('message:receive', (message: Message & { sourceSocketId?: string }) => {
      const processedMessage = {
        ...message,
        createdAt: new Date(message.createdAt),
      }
      
      // Use addMessageIfUnique to prevent duplicates
      useChatStore.getState().addMessageIfUnique(processedMessage)
      useChatStore.getState().setTyping(false)
      
      // NO BroadcastChannel here - socket room already syncs all tabs
    })

    this.socket.on('character:typing', (data: { characterId: string; sourceSocketId?: string }) => {
      useChatStore.getState().setTyping(true)
      // Safety timeout: auto-clear typing if AI response never arrives
      setTimeout(() => useChatStore.getState().setTyping(false), 30000)
      // NO BroadcastChannel here - socket room already syncs all tabs
    })

    this.socket.on('character:mood_change', (data: { mood: string; sourceSocketId?: string }) => {
      useCharacterStore.getState().updateMood(data.mood)
      // NO BroadcastChannel here - socket room already syncs all tabs
    })

    this.socket.on('character:affection_change', (data: { 
      change: number
      newAffection: number
      newLevel?: number
      levelUp?: boolean
      relationshipUpgrade?: boolean
      previousStage?: string
      newStage?: string
      unlocks?: string[]
      rewards?: { coins?: number; gems?: number; affection?: number }
      sourceSocketId?: string
    }) => {
      // Update affection - use newAffection directly instead of change to prevent double updates
      useCharacterStore.getState().setAffection(data.newAffection)
      
      // Show affection popup
      useNotificationStore.getState().showAffectionChange(data.change)
      
      // Show level up modal if leveled up
      if (data.levelUp && data.newLevel) {
        useNotificationStore.getState().showLevelUp(data.newLevel, data.unlocks || [], data.rewards)
      }
      
      // Show relationship upgrade modal
      if (data.relationshipUpgrade && data.previousStage && data.newStage) {
        useNotificationStore.getState().showRelationshipUpgrade(data.previousStage, data.newStage)
      }

      // NO BroadcastChannel here - socket room already syncs all tabs
    })

    // Proactive AI notification (legacy)
    this.socket.on('notification:ai_message', (data: { 
      characterId: string
      message: string
      type: 'morning' | 'night' | 'miss_you' | 'birthday'
    }) => {
      useNotificationStore.getState().showAINotification(data)
    })

    // New proactive notification system
    this.socket.on('notification:proactive', (data: {
      characterId: string
      characterName: string
      type: 'morning_greeting' | 'night_greeting' | 'miss_you' | 'random_thought' | 'anniversary' | 'comeback_message'
      message: string
      sourceSocketId?: string
    }) => {
      useNotificationStore.getState().showProactiveNotification(data)
      // NO BroadcastChannel here - socket room already syncs all tabs
    })

    // Mood update
    this.socket.on('character:mood_update', (data: {
      characterId: string
      mood: string
      moodScore: number
      moodEmoji: string
      description: string
      factors: string[]
      sourceSocketId?: string
    }) => {
      useCharacterStore.getState().setMoodInfo(data)
    })

    // Quest completed notification
    this.socket.on('quest:completed', (data: {
      questId: string
      questTitle: string
      rewards: {
        coins: number
        gems: number
        xp: number
        affection: number
      }
      sourceSocketId?: string
    }) => {
      useNotificationStore.getState().showQuestCompleted({
        questId: data.questId,
        questName: data.questTitle,
        rewards: {
          coins: data.rewards.coins,
          gems: data.rewards.gems,
          xp: data.rewards.xp,
          affection: data.rewards.affection,
        },
      })
    })

    // Milestone unlocked notification
    this.socket.on('milestone:unlocked', (data: {
      milestone: {
        id: string
        name: string
        description?: string
        rewardCoins?: number
        rewardGems?: number
      }
      sourceSocketId?: string
    }) => {
      useNotificationStore.getState().showMilestoneUnlocked({
        milestoneId: data.milestone.id,
        milestoneName: data.milestone.name,
        description: data.milestone.description,
        rewards: {
          coins: data.milestone.rewardCoins,
          gems: data.milestone.rewardGems,
        },
      })
    })

    // General notification from server
    this.socket.on('notification:new', (data: {
      type: string
      title: string
      message: string
      data?: Record<string, unknown>
    }) => {
      useNotificationStore.getState().showGeneralNotification(data)
    })

    // Cross-tab sync events via socket (for multi-device sync)
    this.socket.on('sync:state_request', (data: { requestingSocketId: string }) => {
      // Another tab is requesting state via server
      if (this.socket && data.requestingSocketId !== this.socketId) {
        const messages = useChatStore.getState().messages
        const typing = useChatStore.getState().isTyping
        this.socket.emit('sync:response', {
          targetSocketId: data.requestingSocketId,
          messages,
          typing,
        })
      }
    })

    this.socket.on('sync:state_receive', (data: { 
      messages: Message[]
      typing: boolean
      sourceSocketId: string 
    }) => {
      // Received state from another tab
      useChatStore.getState().mergeMessages(data.messages)
      useChatStore.getState().setTyping(data.typing)
    })

    this.socket.on('error', () => {
      // Socket error handled silently
    })
  }

  // Generic event handlers - track external listeners for re-registration after reconnect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void) {
    // Store for re-registration after reconnect
    this.externalListeners.push({ event, callback: callback as EventCallback })
    this.socket?.on(event, callback)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      // Remove from external listeners
      this.externalListeners = this.externalListeners.filter(
        l => !(l.event === event && l.callback === callback)
      )
      this.socket?.off(event, callback)
    } else {
      // Remove all listeners for this event
      this.externalListeners = this.externalListeners.filter(l => l.event !== event)
      this.socket?.off(event)
    }
  }

  // Re-register all external listeners after reconnection
  private reRegisterExternalListeners() {
    if (!this.socket) return
    this.externalListeners.forEach(({ event, callback }) => {
      this.socket?.on(event, callback)
    })
  }

  emit(event: string, data?: unknown): boolean {
    if (!this.socket?.connected) {
      console.warn(`[Socket] Cannot emit '${event}': socket not connected`)
      return false
    }
    this.socket.emit(event, data)
    return true
  }

  sendMessage(characterId: string, content: string, messageType: string = 'TEXT') {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('message:send', {
      characterId,
      content,
      messageType,
    })
  }

  startTyping(characterId: string) {
    this.socket?.emit('typing:start', characterId)
  }

  stopTyping(characterId: string) {
    this.socket?.emit('typing:stop', characterId)
  }

  // Request state sync from other tabs/devices
  requestSync() {
    this.socket?.emit('sync:request')
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    crossTabSync.destroy()
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocketId(): string | null {
    return this.socketId
  }
}

export const socketService = new SocketService()
