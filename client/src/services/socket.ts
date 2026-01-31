import { io, Socket } from 'socket.io-client';
import { useChatStore, Message } from '@/store/chat-store';
import { useCharacterStore } from '@/store/character-store';

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

    this.socket.on('character:affection_change', ({ change }: { change: number }) => {
      useCharacterStore.getState().updateAffection(change);
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
