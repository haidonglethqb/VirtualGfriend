import { useChatStore, Message } from '@/store/chat-store'

/**
 * CrossTabSyncService - For state synchronization between browser tabs
 * 
 * NOTE: Real-time events (messages, typing, mood, affection) are ALREADY synced
 * via Socket.io room broadcast (server sends to all user's connections).
 * 
 * This service is ONLY used for:
 * 1. Initial state sync when a new tab opens
 * 2. State sync when tab becomes visible (in case socket was disconnected)
 * 3. Sharing persisted state between tabs
 */

type SyncEventType = 
  | 'state:request'
  | 'state:response'

interface SyncPayload {
  type: SyncEventType
  data: unknown
  timestamp: number
  tabId: string
}

class CrossTabSyncService {
  private channel: BroadcastChannel | null = null
  private tabId: string
  private isInitialized = false
  private hasReceivedState = false

  constructor() {
    this.tabId = this.generateTabId()
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return

    try {
      this.channel = new BroadcastChannel('vgfriend-sync')
      this.setupListeners()
      this.isInitialized = true
      
      // Request state from other tabs when initializing (only if we don't have messages)
      const currentMessages = useChatStore.getState().messages
      if (currentMessages.length === 0) {
        this.requestStateFromOtherTabs()
      }
    } catch (error) {
      console.warn('[CrossTabSync] BroadcastChannel not supported:', error)
    }
  }

  private setupListeners() {
    if (!this.channel) return

    this.channel.onmessage = (event: MessageEvent<SyncPayload>) => {
      const { type, data, tabId } = event.data

      // Ignore messages from self
      if (tabId === this.tabId) return

      this.handleSyncMessage(type, data)
    }
  }

  private handleSyncMessage(type: SyncEventType, data: unknown) {
    switch (type) {
      case 'state:request': {
        // Another tab is requesting state, send our current state
        // Only respond if we have messages (to avoid sending empty state)
        const messages = useChatStore.getState().messages
        if (messages.length > 0) {
          this.sendStateResponse()
        }
        break
      }

      case 'state:response': {
        const stateData = data as { 
          messages: Message[]
          isTyping: boolean 
        }
        
        // Always merge if remote has more messages (not just first response)
        const currentMessages = useChatStore.getState().messages
        if (stateData.messages.length > currentMessages.length) {
          const mergedMessages = this.mergeMessages(currentMessages, stateData.messages)
          useChatStore.getState().setMessages(mergedMessages)
        }
        
        // Update typing state
        if (stateData.isTyping) {
          useChatStore.getState().setTyping(stateData.isTyping)
        }
        break
      }
    }
  }

  private mergeMessages(local: Message[], remote: Message[]): Message[] {
    const messageMap = new Map<string, Message>()
    
    // Add local messages first
    local.forEach(msg => messageMap.set(msg.id, msg))
    
    // Merge remote messages (won't overwrite existing)
    remote.forEach(msg => {
      if (!messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg)
      }
    })
    
    // Sort by createdAt
    return Array.from(messageMap.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateA - dateB
    })
  }

  private broadcast(type: SyncEventType, data: unknown) {
    if (!this.channel) return

    const payload: SyncPayload = {
      type,
      data,
      timestamp: Date.now(),
      tabId: this.tabId,
    }

    try {
      this.channel.postMessage(payload)
    } catch (error) {
      console.warn('[CrossTabSync] Failed to broadcast:', error)
    }
  }

  /**
   * Request state from other tabs
   * Used when: new tab opens, tab becomes visible after being hidden
   */
  requestStateFromOtherTabs() {
    this.hasReceivedState = false // Reset flag to accept new response
    this.broadcast('state:request', {})
  }

  private sendStateResponse() {
    const messages = useChatStore.getState().messages
    const isTyping = useChatStore.getState().isTyping
    
    this.broadcast('state:response', { messages, isTyping })
  }

  getTabId(): string {
    return this.tabId
  }

  destroy() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.isInitialized = false
    this.hasReceivedState = false
  }
}

export const crossTabSync = new CrossTabSyncService()
