import type { Building, Player } from '@shared/config';

export type GameEvent =
  | { type: 'BASE_DESTROYED'; owner: Player }
  | { type: 'BUILDING_DESTROYED'; building: Building; owner: Player }
  | { type: 'BUILDING_SPAWNED'; building: Building; owner: Player };

type EventHandler = (event: GameEvent) => void;

class EventBus {
  private handlers: EventHandler[] = [];

  subscribe(handler: EventHandler) {
    this.handlers.push(handler);

    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  emit(event: GameEvent) {
    this.handlers.forEach(handler => handler(event));
  }
}

export const gameEvents = new EventBus();
