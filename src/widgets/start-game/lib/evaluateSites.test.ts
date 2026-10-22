import { expect, it } from 'vite-plus/test';
import type { Cell, Site } from '@shared/config';
import { evaluateMap } from './evaluateMap';
import { getStartPositions, placeStartResources } from './initializeGame';

const fixture = () => {
  const grid: Cell[][] = Array.from({ length: 30 }, (_, y) =>
    Array.from({ length: 30 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  const starts = getStartPositions(30, 30, 2);
  placeStartResources(grid, starts);
  const sites: Site[] = [
    { id: 'a', type: 'cache', x: 7, y: 1, resource: 'gold', amount: 80 },
    { id: 'b', type: 'cache', x: 22, y: 28, resource: 'gold', amount: 80 },
    { id: 'c', type: 'refugees', x: 1, y: 8 },
    { id: 'd', type: 'refugees', x: 28, y: 21 },
    { id: 'e', type: 'obelisk', x: 9, y: 9 },
    { id: 'f', type: 'obelisk', x: 20, y: 20 },
    { id: 'g', type: 'ruins', x: 13, y: 13 },
    { id: 'h', type: 'ruins', x: 16, y: 16 },
    { id: 'i', type: 'camp', x: 14, y: 14, hiresLeft: 3 },
  ];
  return { grid, starts, sites };
};

it('принимает находки на траве с путём от каждого старта, включая расстояние ровно 6', () => {
  const { grid, starts, sites } = fixture();
  expect(evaluateMap(grid, starts, sites)).toEqual({ ok: true });
});

it('отклоняет перекос ближайших тайников при честных ресурсах', () => {
  const { grid, starts, sites } = fixture();
  Object.assign(sites[1], { x: 8, y: 1 });
  expect(evaluateMap(grid, starts)).toEqual({ ok: true });
  expect(evaluateMap(grid, starts, sites)).toEqual({
    ok: false,
    reason: 'sites',
  });
});

it('для общего лагеря допускает разницу цены пути 4, отклоняет 6', () => {
  const { grid, starts, sites } = fixture();
  sites[8].y = 13;
  expect(evaluateMap(grid, starts, sites)).toEqual({ ok: true });
  sites[8].y = 12;
  expect(evaluateMap(grid, starts, sites)).toEqual({
    ok: false,
    reason: 'sites',
  });
});

it('отклоняет находку на доступной клетке без наземного пути к ней', () => {
  const { grid, starts, sites } = fixture();
  for (const [x, y] of [
    [8, 9],
    [10, 9],
    [9, 8],
    [9, 10],
  ]) {
    grid[y][x].type = 'water';
    grid[y][x].isWalkable = false;
  }
  expect(evaluateMap(grid, starts)).toEqual({ ok: true });
  expect(evaluateMap(grid, starts, sites)).toEqual({
    ok: false,
    reason: 'sites',
  });
});

it.each(['near', 'terrain', 'duplicate', 'missing'] as const)(
  'отклоняет неправильную расстановку: %s',
  kind => {
    const { grid, starts, sites } = fixture();
    if (kind === 'near') sites[0].x = 6;
    if (kind === 'terrain') grid[9][9].type = 'hill';
    if (kind === 'duplicate') Object.assign(sites[1], { x: 7, y: 1 });
    const checked =
      kind === 'missing' ? sites.filter(s => s.type !== 'obelisk') : sites;
    expect(evaluateMap(grid, starts, checked)).toEqual({
      ok: false,
      reason: 'sites',
    });
  },
);
