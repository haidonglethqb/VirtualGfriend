import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/services/api'

export interface Message {
  id: string
  role: 'USER' | 'AI' | 'ASSISTANT' | 'SYSTEM'
  content: string
  messageType: string
  emotion?: string
  createdAt: Date | string
  isOwn?: boolean
}

interface MessagesData {
  messages: Message[]
  total: number
  page: number
  limit: number
}

interface ChatState {
  messages: Message[]
  isTyping: boolean
  isConnected: boolean
  isLoading: boolean
  lastSyncTimestamp: number
  
  // Actions
  addMessage: (message: Message) => void
  addMessageIfUnique: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setTyping: (isTyping: boolean) => void
  setConnected: (isConnected: boolean) => void
  fetchMessages: () => Promise<void>
  clearMessages: () => void
  mergeMessages: (newMessages: Message[]) => void
}

const MAX_PERSISTED_MESSAGES = 100

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isTyping: false,
      isConnected: false,
      isLoading: false,
      lastSyncTimestamp: 0,

      addMessage: (message: Message) => {
        set((state: ChatState) => {
          const newMessages = [...state.messages, message]
          // Keep only last MAX_PERSISTED_MESSAGES
          const trimmedMessages = newMessages.slice(-MAX_PERSISTED_MESSAGES)
          return { 
            messages: trimmedMessages,
            lastSyncTimestamp: Date.now(),
          }
        })
      },

      // Add message only if it doesn't already exist (deduplication)
      addMessageIfUnique: (message: Message) => {
        set((state: ChatState) => {
          // Check if message already exists by id
          const exists = state.messages.some(m => m.id === message.id)
          if (exists) {
            return state // No change
          }
          
          const newMessages = [...state.messages, message]
          const trimmedMessages = newMessages.slice(-MAX_PERSISTED_MESSAGES)
          return { 
            messages: trimmedMessages,
            lastSyncTimestamp: Date.now(),
          }
        })
      },

      setMessages: (messages: Message[]) => {
        const trimmedMessages = messages.slice(-MAX_PERSISTED_MESSAGES)
        set({ 
          messages: trimmedMessages,
          lastSyncTimestamp: Date.now(),
        })
      },

      setTyping: (isTyping: boolean) => {
        set({ isTyping })
      },

      setConnected: (isConnected: boolean) => {
        set({ isConnected })
      },

      fetchMessages: async () => {
        set({ isLoading: true })
        try {
          const response = await api.get<MessagesData>('/chat/history')
          if (response.success && response.data) {
            const currentMessages = get().messages
            const fetchedMessages = response.data.messages || []
            
            // Merge fetched messages with existing (for offline support)
            const messageMap = new Map<string, Message>()
            
            // Add current messages
            currentMessages.forEach(msg => messageMap.set(msg.id, msg))
            
            // Add/update from server (server is authoritative)
            fetchedMessages.forEach(msg => messageMap.set(msg.id, msg))
            
            // Sort by createdAt and trim
            const merged = Array.from(messageMap.values())
              .sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime()
                const dateB = new Date(b.createdAt).getTime()
                return dateA - dateB
              })
              .slice(-MAX_PERSISTED_MESSAGES)
            
            set({ 
              messages: merged, 
              isLoading: false,
              lastSyncTimestamp: Date.now(),
            })
          } else {
            set({ isLoading: false })
          }
        } catch {
          // Keep existing messages on error
          set({ isLoading: false })
        }
      },

      clearMessages: () => {
        set({ 
          messages: [],
          lastSyncTimestamp: Date.now(),
        })
      },

      // Merge messages from cross-tab sync or reconnection
      mergeMessages: (newMessages: Message[]) => {
        set((state: ChatState) => {
          const messageMap = new Map<string, Message>()
          
          // Add current messages
          state.messages.forEach(msg => messageMap.set(msg.id, msg))
          
          // Add new messages (won't overwrite if same id)
          newMessages.forEach(msg => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg)
            }
          })
          
          // Sort and trim
          const merged = Array.from(messageMap.values())
            .sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime()
              const dateB = new Date(b.createdAt).getTime()
              return dateA - dateB
            })
            .slice(-MAX_PERSISTED_MESSAGES)
          
          return { 
            messages: merged,
            lastSyncTimestamp: Date.now(),
          }
        })
      },
    }),
    {
      name: 'vgfriend-chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
        lastSyncTimestamp: state.lastSyncTimestamp,
      }),
    }
  )
)
