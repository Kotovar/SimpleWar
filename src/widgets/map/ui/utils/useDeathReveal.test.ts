import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Position, Unit } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { watchDeathReveals } from './useDeathReveal';

const die = (owner: 'p1' | 'p2', x: number, y = 0) =>
  gameEvents.emit({
    type: 'UNIT_DESTROYED',
    unit: { x, y, owner } as Unit,
    owner,
  });

let cells: Position[];
const onChange = (next: Position[]) => {
  cells = next;
};

beforeEach(() => {
  vi.useFakeTimers();
  cells = [];
});
afterEach(() => vi.useRealTimers());

describe('watchDeathReveals', () => {
  it('открывает клетки своих гибелей, каждую на 2 с', () => {
    const stop = watchDeathReveals('p1', onChange);
    die('p1', 1);
    die('p2', 5);
    vi.advanceTimersByTime(1000);
    // Вторая гибель на той же клетке истекает независимо.
    die('p1', 1);
    expect(cells).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 0 },
    ]);
    vi.advanceTimersByTime(1000);
    expect(cells).toEqual([{ x: 1, y: 0 }]);
    vi.advanceTimersByTime(1000);
    expect(cells).toEqual([]);
    stop();
  });

  it('сброс партии очищает список и отменяет таймеры', () => {
    const stop = watchDeathReveals('p1', onChange);
    die('p1', 1);
    gameEvents.emit({ type: 'GAME_RESET' });
    expect(cells).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it('отписка (смена участника, размонтирование) отменяет таймеры', () => {
    const changes = vi.fn();
    const stop = watchDeathReveals('p1', changes);
    die('p1', 1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    die('p1', 2);
    vi.advanceTimersByTime(3000);
    expect(changes).toHaveBeenCalledTimes(1);
  });
});
