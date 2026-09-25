import type { Building, ParticipantId, Unit } from '@shared/config';

type GameEvent =
  | { type: 'BASE_DESTROYED'; owner: ParticipantId }
  | { type: 'BUILDING_SPAWNED'; building: Building; owner: ParticipantId }
  | { type: 'BUILDING_DESTROYED'; building: Building; owner: ParticipantId }
  | { type: 'UNIT_SPAWNED'; unit: Unit; owner: ParticipantId }
  | { type: 'UNIT_DESTROYED'; unit: Unit; owner: ParticipantId };

type EventHandler = (event: GameEvent) => void;

class EventBus {
  private handlers = new Set<EventHandler>();

  /**
   * Подписывает обработчик на игровые события.
   *
   * @param handler - Функция обработки события.
   * @returns Функция отмены именно этой подписки.
   */
  subscribe(handler: EventHandler) {
    // Обёртка позволяет подписать один обработчик несколько раз независимо.
    const subscription = (event: GameEvent) => handler(event);
    this.handlers.add(subscription);

    return () => {
      this.handlers.delete(subscription);
    };
  }

  /**
   * Рассылает событие по снимку подписок, пропуская отписавшихся.
   *
   * @param event - Игровое событие для рассылки.
   */
  emit(event: GameEvent) {
    for (const handler of Array.from(this.handlers)) {
      if (this.handlers.has(handler)) handler(event);
    }
  }
}

export const gameEvents = new EventBus();
