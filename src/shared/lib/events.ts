import type { Building, Player, Unit } from '@shared/config';

type GameEvent =
  | { type: 'BASE_DESTROYED'; owner: Player }
  | { type: 'BUILDING_SPAWNED'; building: Building; owner: Player }
  | { type: 'BUILDING_DESTROYED'; building: Building; owner: Player }
  | { type: 'UNIT_SPAWNED'; unit: Unit; owner: Player }
  | { type: 'UNIT_DESTROYED'; unit: Unit; owner: Player };

type EventHandler = (event: GameEvent) => void;

class EventBus {
  private handlers = new Set<EventHandler>();

  subscribe(handler: EventHandler) {
    const subscription = (event: GameEvent) => handler(event);
    this.handlers.add(subscription);

    return () => {
      this.handlers.delete(subscription);
    };
  }

  emit(event: GameEvent) {
    for (const handler of Array.from(this.handlers)) {
      if (this.handlers.has(handler)) handler(event);
    }
  }
}

export const gameEvents = new EventBus();
