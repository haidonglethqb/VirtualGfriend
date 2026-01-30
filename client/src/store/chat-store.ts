import { create } from 'zustand';
import { api } from '@/services/api';

export interface Message {
  id: string;
  role: 'USER' | 'AI' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  messageType: string;
  emotion?: string;
  createdAt: Date | string;
  isOwn?: boolean;
}

interface MessagesData {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isConnected: boolean;
  isLoading: boolean;
  
  // Actions
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setTyping: (isTyping: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  fetchMessages: () => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  isConnected: false,
  isLoading: false,

  addMessage: (message: Message) => {
    set((state: ChatState) => ({
      messages: [...state.messages, message],
    }));
  },

  setMessages: (messages: Message[]) => {
    set({ messages });
  },

  setTyping: (isTyping: boolean) => {
    set({ isTyping });
  },

  setConnected: (isConnected: boolean) => {
    set({ isConnected });
  },

  fetchMessages: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<MessagesData>('/chat/history');
      if (response.success && response.data) {
        set({ messages: response.data.messages || [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      // Ignore errors - no messages yet
      set({ messages: [], isLoading: false });
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
