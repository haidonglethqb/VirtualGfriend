import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/services/api'

export interface Message {
  id: string
  role: 'USER' | 'AI' | 'ASSISTANT' | 'SYSTEM'
  content: string
  messageType: string
  emotion?: string
  createdAt: Date | string // Can be string when rehydrated from localStorage
  isOwn?: boolean
}

// Helper to normalize date strings to Date objects
function normalizeMessageDate(msg: Message): Message {
  if (typeof msg.createdAt === 'string') {
    return { ...msg, createdAt: new Date(msg.createdAt) }
  }
  return msg
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
  replaceMessage: (tempId: string, realMessage: Message) => void
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

      // Replace an optimistic (temp) message with the real server message.
      // Uses two-key matching: first tries exact tempId match (clientId),
      // then falls back to matching on content+role+createdAt to handle
      // cases where the server returns a different ID.
      replaceMessage: (tempId: string, realMessage: Message) => {
        set((state: ChatState) => {
          // Primary lookup: match by tempId (clientId)
          let idx = state.messages.findIndex(m => m.id === tempId)

          // Fallback: match by content + role + approximate timestamp
          if (idx === -1) {
            const realTime = new Date(realMessage.createdAt).getTime()
            idx = state.messages.findIndex(m => {
              if (m.role !== realMessage.role || m.content !== realMessage.content) return false
              const msgTime = new Date(m.createdAt).getTime()
              // Match if within 5 second window (covers clock skew + processing delay)
              return Math.abs(msgTime - realTime) < 5000
            })
          }

          if (idx === -1) {
            // Temp message not found at all, add if unique by realMessage.id
            const exists = state.messages.some(m => m.id === realMessage.id)
            if (exists) return state
            const newMessages = [...state.messages, realMessage].slice(-MAX_PERSISTED_MESSAGES)
            return { messages: newMessages, lastSyncTimestamp: Date.now() }
          }

          const newMessages = [...state.messages]
          newMessages[idx] = realMessage
          return { messages: newMessages, lastSyncTimestamp: Date.now() }
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
            const fetchedMessages = response.data.messages || []

            // Server is authoritative - replace local messages entirely
            const sorted = fetchedMessages
              .sort((a: Message, b: Message) => {
                const dateA = new Date(a.createdAt).getTime()
                const dateB = new Date(b.createdAt).getTime()
                return dateA - dateB
              })
              .slice(-MAX_PERSISTED_MESSAGES)

            set({
              messages: sorted,
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
      // L19 fix: prefer newer version when same id exists
      mergeMessages: (newMessages: Message[]) => {
        set((state: ChatState) => {
          const messageMap = new Map<string, Message>()

          // Add current messages, normalize dates
          state.messages.forEach(msg => messageMap.set(msg.id, normalizeMessageDate(msg)))

          // Add new messages - prefer newer version if same id
          newMessages.forEach(newMsg => {
            const existing = messageMap.get(newMsg.id)
            if (!existing) {
              messageMap.set(newMsg.id, normalizeMessageDate(newMsg))
            } else {
              // Keep the newer version by createdAt
              const existingTime = new Date(existing.createdAt).getTime()
              const newTime = new Date(newMsg.createdAt).getTime()
              if (newTime > existingTime) {
                messageMap.set(newMsg.id, normalizeMessageDate(newMsg))
              }
            }
          })

          // Sort and trim
          const merged = Array.from(messageMap.values())
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
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
