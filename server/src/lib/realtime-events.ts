import { EventEmitter } from 'events';
import type { FactSaveResult } from '../modules/character/fact-quota.service';

type ManualFactUpdate = FactSaveResult & {
  userId: string;
  source: 'manual';
};

interface RealtimeEvents {
  'character:facts_update': ManualFactUpdate;
}

class TypedRealtimeEvents {
  private emitter = new EventEmitter();

  emit<K extends keyof RealtimeEvents>(event: K, payload: RealtimeEvents[K]) {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof RealtimeEvents>(event: K, listener: (payload: RealtimeEvents[K]) => void) {
    this.emitter.on(event, listener);
  }
}

export const realtimeEvents = new TypedRealtimeEvents();
