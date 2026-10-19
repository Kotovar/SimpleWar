import { describe, expect, it } from 'vite-plus/test';
import { findCheapestPaths, type MovementGrid } from './terrain';

/** Эталон: прежний Дейкстра с корзинами на `Map`. */
const reference = (
  costs: MovementGrid,
  start: { x: number; y: number },
  maxCost = Infinity,
) => {
  const width = costs[0]?.length ?? 0;
  const cost = new Map<number, number>();
  const previous = new Map<number, number>();
  if (costs[start.y]?.[start.x] === undefined) return { cost, previous, width };
  const startKey = start.y * width + start.x;
  cost.set(startKey, 0);
  const buckets: number[][] = [[startKey]];
  for (let current = 0; current < buckets.length; current++) {
    for (const key of buckets[current] ?? []) {
      if (cost.get(key) !== current) continue;
      const x = key % width;
      const y = (key - x) / width;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const enter = costs[y + dy]?.[x + dx];
        if (!enter) continue;
        const next = current + enter;
        const nextKey = (y + dy) * width + x + dx;
        if (next > maxCost || next >= (cost.get(nextKey) ?? Infinity)) continue;
        cost.set(nextKey, next);
        previous.set(nextKey, key);
        (buckets[next] ??= []).push(nextKey);
      }
    }
  }
  return { cost, previous, width };
};

/** Воспроизводимая сетка: стены (0), поле (1), холм и болото (2). */
const grid = (width: number, height: number, seed: number): MovementGrid => {
  let state = seed;
  const random = () =>
    (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => {
      const r = random();
      return r < 0.2 ? 0 : r < 0.75 ? 1 : 2;
    }),
  );
};

describe('findCheapestPaths', () => {
  it('совпадает с эталоном по ценам, предкам и порядку клеток', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const costs = grid(17, 11, seed);
      const start = { x: seed % 17, y: seed % 11 };
      for (const maxCost of [Infinity, 5]) {
        const actual = findCheapestPaths(costs, start, maxCost);
        const expected = reference(costs, start, maxCost);
        expect([...actual.cost]).toEqual([...expected.cost]);
        expect([...actual.previous]).toEqual([...expected.previous]);
      }
    }
  });

  it('занятая стартовая клетка — начало пути, старт вне карты — пусто', () => {
    const costs = [
      [0, 1, 1],
      [1, 2, 0],
    ];

    expect(findCheapestPaths(costs, { x: 0, y: 0 }).cost.get(2)).toBe(2);
    expect(findCheapestPaths(costs, { x: 5, y: 0 }).cost.size).toBe(0);
    expect(findCheapestPaths(costs, { x: 0.5, y: 0 }).cost.size).toBe(0);
  });
});
