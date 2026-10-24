import { afterEach, expect, it, vi } from 'vite-plus/test';
import { CACHE_REWARDS, type Cell, type StartPosition } from '@shared/config';
import { placeSites } from './placeSites';

const field = (width = 30, height = 30): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
const starts = (
  width: number,
  height: number,
  count: number,
): StartPosition[] =>
  [
    { base: { x: 1, y: 1 }, worker: { x: 2, y: 1 } },
    {
      base: { x: width - 2, y: height - 2 },
      worker: { x: width - 3, y: height - 2 },
    },
    { base: { x: width - 2, y: 1 }, worker: { x: width - 3, y: 1 } },
    { base: { x: 1, y: height - 2 }, worker: { x: 2, y: height - 2 } },
  ].slice(0, count);

afterEach(() => vi.restoreAllMocks());

it('позиции, ID и награды воспроизводятся по сиду, без Math.random и изменений рельефа', () => {
  const grid = field();
  const original = structuredClone(grid);
  vi.spyOn(Math, 'random').mockReturnValue(0.1);
  const first = placeSites(grid, starts(30, 30, 2), 43);
  expect(first).not.toBeNull();
  vi.spyOn(Math, 'random').mockReturnValue(0.9);
  expect(placeSites(grid, starts(30, 30, 2), 43)).toEqual(first);
  expect(placeSites(grid, starts(30, 30, 2), 44)).not.toEqual(first);
  expect(grid).toEqual(original);
});

it.each([
  [30, 30, 2],
  [30, 30, 4],
  [31, 35, 4],
])(
  'на %s × %s для %s стартов зеркалит находки и содержимое тайников; лагерь общий',
  (width, height, count) => {
    const points = starts(width, height, count);
    const sites = placeSites(field(width, height), points, 43)!;
    expect(sites).not.toBeNull();
    expect(sites.filter(site => site.type === 'camp')).toHaveLength(1);
    expect(new Set(sites.map(site => site.y * width + site.x)).size).toBe(
      sites.length,
    );
    for (const site of sites) {
      expect(
        points.every(
          ({ base }) =>
            Math.abs(site.x - base.x) + Math.abs(site.y - base.y) >= 6,
        ),
      ).toBe(true);
      if (site.type === 'camp') continue;
      const mirrors =
        count === 2
          ? [{ x: width - 1 - site.x, y: height - 1 - site.y }]
          : [
              { x: width - 1 - site.x, y: site.y },
              { x: site.x, y: height - 1 - site.y },
            ];
      for (const position of mirrors) {
        const other = sites.find(s => s.x === position.x && s.y === position.y);
        expect(other?.type).toBe(site.type);
        if (site.type === 'cache') {
          const [min, max] = CACHE_REWARDS[site.resource];
          expect(site.amount).toBeGreaterThanOrEqual(min);
          expect(site.amount).toBeLessThanOrEqual(max);
          expect(other).toMatchObject({
            resource: site.resource,
            amount: site.amount,
          });
        }
      }
    }
    if (width === 30)
      expect(sites.filter(s => s.type === 'cache')).toHaveLength(count);
  },
);

it('количество находок растёт медленнее площади', () => {
  const small = placeSites(field(), starts(30, 30, 4), 43)!;
  const large = placeSites(field(100, 100), starts(100, 100, 4), 43)!;
  expect(large).not.toBeNull();
  expect(large.length).toBeGreaterThan(small.length);
  expect(large.length).toBeLessThan(small.length * 4);
  expect(large.filter(s => s.type === 'camp')).toHaveLength(1);
});

it('на большой карте находок меньше: 49 на четверых вместо 221', () => {
  const sites = placeSites(field(100, 100), starts(100, 100, 4), 43)!;
  expect(sites).not.toBeNull();
  expect(sites).toHaveLength(49);
});

it.each([2, 4])(
  'находки для %s сторон не кучкуются и занимают все четверти карты',
  count => {
    for (const [width, height] of [
      [30, 30],
      [31, 35],
      [100, 60],
      [100, 100],
    ]) {
      for (const seed of [0, 7, 43, 99]) {
        const sites = placeSites(
          field(width, height),
          starts(width, height, count),
          seed,
        )!;
        expect(sites).not.toBeNull();
        expect(
          new Set(
            sites.map(
              site =>
                `${Number(site.x >= width / 2)},${Number(site.y >= height / 2)}`,
            ),
          ).size,
        ).toBe(4);
        for (let i = 0; i < sites.length; i++) {
          for (const other of sites.slice(i + 1)) {
            expect(
              Math.abs(sites[i].x - other.x) + Math.abs(sites[i].y - other.y),
            ).toBeGreaterThanOrEqual(5);
          }
        }
      }
    }
  },
);

it('не использует непроходимые и недоступные клетки', () => {
  const grid = field();
  for (const row of grid) {
    row[15].type = 'water';
    row[15].isWalkable = false;
  }
  expect(placeSites(grid, starts(30, 30, 2), 43)).toBeNull();
});
