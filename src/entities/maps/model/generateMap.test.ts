import { afterEach, expect, it, vi } from 'vite-plus/test';
import { generateMap } from './generateMap';

afterEach(() => vi.restoreAllMocks());

it.each([0, 1, 12354, 215412312])(
  'reproduces the whole map, including gold, with seed %s',
  seed => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const first = generateMap(15, 15, seed);
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(generateMap(15, 15, seed)).toEqual(first);
  },
);

it.each([
  [15, 15],
  [20, 12],
  [9, 9],
])('mirrors the whole map around its centre on %sx%s', (w, h) => {
  for (const seed of [0, 15, 42, 90]) {
    const grid = generateMap(w, h, seed);

    expect(grid.flat().some(cell => cell.type === 'gold')).toBe(true);
    for (const { x, y, type } of grid.flat()) {
      expect(grid[h - 1 - y][w - 1 - x].type).toBe(type);
    }
  }
});

it('keeps plains without obstacles around both start corners', () => {
  for (let i = 0; i < 100; i++) {
    const grid = generateMap(30, 30, i);
    for (const { x, y, type } of grid.flat()) {
      if (Math.min(Math.hypot(x, y), Math.hypot(29 - x, 29 - y)) > 3) continue;
      expect(['grass', 'gold']).toContain(type);
    }
  }
});

it.each([
  [5, 5],
  [6, 5],
])('places at least the minimum gold on a small %sx%s map', (w, h) => {
  for (let i = 0; i < 100; i++) {
    const gold = generateMap(w, h, i)
      .flat()
      .filter(cell => cell.type === 'gold');
    expect(gold.length).toBeGreaterThanOrEqual(8);
  }
});

it('rejects invalid dimensions before allocating a map', () => {
  expect(() => generateMap(0, 15, 1)).toThrow();
  expect(() => generateMap(15.5, 15, 1)).toThrow();
  expect(() => generateMap(101, 15, 1)).toThrow(RangeError);
});

it('rejects a fractional seed', () => {
  expect(() => generateMap(15, 15, 0.42)).toThrow();
});

it.each([NaN, Infinity, -Infinity])('rejects non-finite seed %s', seed => {
  expect(() => generateMap(15, 15, seed)).toThrow(RangeError);
});

it('keeps grass next to every gold cell so a mine can be built', () => {
  for (let i = 0; i < 200; i++) {
    const grid = generateMap(20, 15, i);
    for (const { x, y, type } of grid.flat()) {
      if (type !== 'gold') continue;
      const neighbours = [-1, 0, 1].flatMap(dy =>
        [-1, 0, 1].map(dx => grid[y + dy]?.[x + dx]?.type),
      );
      expect(neighbours).toContain('grass');
    }
  }
});
