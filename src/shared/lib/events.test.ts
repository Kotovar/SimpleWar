import { afterEach, describe, expect, it } from 'vite-plus/test';
import { gameEvents } from './events';

const unsubscribe: Array<() => void> = [];

afterEach(() => {
  unsubscribe.splice(0).forEach(stop => stop());
});

describe('gameEvents', () => {
  it('keeps duplicate registrations independent when unsubscribing', () => {
    const received: unknown[] = [];
    const handler = (event: unknown) => received.push(event);
    const event = { type: 'BASE_DESTROYED', owner: 'p1' } as const;

    const stopFirst = gameEvents.subscribe(handler);
    const stopSecond = gameEvents.subscribe(handler);
    unsubscribe.push(stopFirst, stopSecond);

    gameEvents.emit(event);
    stopFirst();
    gameEvents.emit(event);
    stopSecond();
    gameEvents.emit(event);

    expect(received).toEqual([event, event, event]);
  });
});
