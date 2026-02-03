import { io, Socket } from 'socket.io-client';
import { useChatStore, Message } from '@/store/chat-store';
import { useCharacterStore } from '@/store/character-store';
import { useNotificationStore } from '@/store/notification-store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      useChatStore.getState().setConnected(true);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      useChatStore.getState().setConnected(false);
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
    });

    // Chat events
    this.socket.on('message:receive', (message: Message) => {
      useChatStore.getState().addMessage({
        ...message,
        createdAt: new Date(message.createdAt),
      });
      useChatStore.getState().setTyping(false);
    });

    this.socket.on('character:typing', () => {
      useChatStore.getState().setTyping(true);
    });

    this.socket.on('character:mood_change', ({ mood }: { mood: string }) => {
      useCharacterStore.getState().updateMood(mood);
    });

    this.socket.on('character:affection_change', ({ change, newAffection, newLevel, levelUp, relationshipUpgrade, previousStage, newStage, unlocks, rewards }: { 
      change: number;
      newAffection: number;
      newLevel?: number;
      levelUp?: boolean;
      relationshipUpgrade?: boolean;
      previousStage?: string;
      newStage?: string;
      unlocks?: string[];
      rewards?: { coins?: number; gems?: number; affection?: number };
    }) => {
      // Update affection
      useCharacterStore.getState().updateAffection(change);
      
      // Show affection popup
      useNotificationStore.getState().showAffectionChange(change);
      
      // Show level up modal if leveled up
      if (levelUp && newLevel) {
        useNotificationStore.getState().showLevelUp(newLevel, unlocks || [], rewards);
      }
      
      // Show relationship upgrade modal
      if (relationshipUpgrade && previousStage && newStage) {
        useNotificationStore.getState().showRelationshipUpgrade(previousStage, newStage);
      }
    });

    // Proactive AI notification (legacy)
    this.socket.on('notification:ai_message', (data: { 
      characterId: string;
      message: string;
      type: 'morning' | 'night' | 'miss_you' | 'birthday';
    }) => {
      useNotificationStore.getState().showAINotification(data);
    });

    // New proactive notification system
    this.socket.on('notification:proactive', (data: {
      characterId: string;
      characterName: string;
      type: 'morning_greeting' | 'night_greeting' | 'miss_you' | 'random_thought' | 'anniversary' | 'comeback_message';
      message: string;
    }) => {
      useNotificationStore.getState().showProactiveNotification(data);
    });

    // Mood update
    this.socket.on('character:mood_update', (data: {
      characterId: string;
      mood: string;
      moodScore: number;
      moodEmoji: string;
      description: string;
      factors: string[];
    }) => {
      useCharacterStore.getState().setMoodInfo(data);
    });

    this.socket.on('error', () => {
      // Socket error handled silently
    });
  }

  // Generic event handlers
  on(event: string, callback: (...args: unknown[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  sendMessage(characterId: string, content: string, messageType: string = 'TEXT') {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('message:send', {
      characterId,
      content,
      messageType,
    });
  }

  startTyping(characterId: string) {
    this.socket?.emit('typing:start', characterId);
  }

  stopTyping(characterId: string) {
    this.socket?.emit('typing:stop', characterId);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
