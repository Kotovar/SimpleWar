import { afterEach, expect, it, vi } from 'vite-plus/test';
import { generateMap } from './generateMap';

afterEach(() => vi.restoreAllMocks());

it.each([2, 3, 4])(
  'богатые жилы воспроизводимы, только на золоте и зеркальны для %s сторон',
  participants => {
    for (let seed = 0; seed < 20; seed++) {
      const grid = generateMap(30, 30, seed, participants);
      const rich = grid.flat().filter(c => c.rich);
      expect(rich.length).toBeGreaterThan(0);
      expect(rich.length).toBeLessThan(
        grid.flat().filter(c => c.type === 'gold').length,
      );
      expect(generateMap(30, 30, seed, participants)).toEqual(grid);
      for (const c of grid.flat()) {
        if (c.rich) expect(c.type).toBe('gold');
        expect(grid[29 - c.y][29 - c.x].rich).toBe(c.rich);
        if (participants > 2) expect(grid[c.y][29 - c.x].rich).toBe(c.rich);
      }
    }
  },
);

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

it.each([
  [30, 30],
  [31, 35],
  [100, 60],
  [100, 100],
])('групповая карта %s × %s отражается по обеим осям', (width, height) => {
  for (let seed = 0; seed < 20; seed++) {
    const grid = generateMap(width, height, seed, 4);
    expect(generateMap(width, height, seed, 3)).toEqual(grid);
    const cells = grid.flat();
    expect(cells.filter(c => c.type === 'swamp').length).toBeLessThanOrEqual(
      Math.floor(cells.length * 0.1),
    );
    const terrain = grid.map(row => row.map(c => [c.type, c.isWalkable]));
    expect(terrain).toEqual(terrain.map(row => [...row].reverse()));
    expect(terrain).toEqual([...terrain].reverse());
    for (const { x, y, type } of cells) {
      if (type === 'gold') {
        expect(
          [-1, 0, 1].flatMap(dy =>
            [-1, 0, 1].map(dx => grid[y + dy]?.[x + dx]?.type),
          ),
        ).toContain('grass');
      }
    }
  }
});

it.each([0, 1, 5, 2.5, NaN])('отклоняет число участников %s', count => {
  expect(() => generateMap(30, 30, 43, count)).toThrow(RangeError);
});
