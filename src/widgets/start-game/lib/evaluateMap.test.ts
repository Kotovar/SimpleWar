import { describe, expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { evaluateMap, type StartPosition } from './evaluateMap';

const starts: StartPosition[] = [
  { base: { x: 1, y: 1 }, worker: { x: 2, y: 1 } },
  { base: { x: 5, y: 5 }, worker: { x: 4, y: 5 } },
];

const map = (): Cell[][] => {
  const grid: Cell[][] = Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  for (const [x, y, type] of [
    [0, 3, 'gold'],
    [6, 3, 'gold'],
    [3, 0, 'forest'],
    [3, 6, 'forest'],
  ] as const) {
    grid[y][x].type = type;
    grid[y][x].isWalkable = false;
  }
  return grid;
};

describe('evaluateMap', () => {
  it('accepts connected, symmetric starts with approaches to both resources', () => {
    expect(evaluateMap(map(), starts)).toEqual({ ok: true });
  });

  it('rejects a route cut after bases are treated as occupied', () => {
    const grid = map();
    for (const row of grid) {
      row[3].type = 'water';
      row[3].isWalkable = false;
    }
    expect(evaluateMap(grid, starts)).toEqual({ ok: false, reason: 'route' });
  });

  it('rejects a resource with no reachable approach', () => {
    const grid = map();
    for (const row of grid)
      for (const cell of row) {
        if (cell.type === 'gold') cell.type = 'grass';
      }
    grid[3][3].type = 'gold';
    grid[3][3].isWalkable = false;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        grid[3 + dy][3 + dx].type = 'water';
        grid[3 + dy][3 + dx].isWalkable = false;
      }
    expect(evaluateMap(grid, starts)).toEqual({ ok: false, reason: 'gold' });
  });

  it('rejects a base with only one exit', () => {
    const grid = map();
    for (const [x, y] of [
      [0, 1],
      [1, 0],
      [1, 2],
    ]) {
      grid[y][x].type = 'water';
      grid[y][x].isWalkable = false;
    }
    expect(evaluateMap(grid, starts)).toEqual({ ok: false, reason: 'exit' });
  });

  it('rejects starts with unequal costs to the nearest resources', () => {
    const grid: Cell[][] = Array.from({ length: 9 }, (_, y) =>
      Array.from({ length: 9 }, (_, x) => ({
        x,
        y,
        type: 'grass',
        isWalkable: true,
      })),
    );
    grid[3][0].type = 'gold';
    grid[3][0].isWalkable = false;
    grid[0][3].type = 'forest';
    grid[0][3].isWalkable = false;
    expect(
      evaluateMap(grid, [
        starts[0],
        { base: { x: 7, y: 7 }, worker: { x: 6, y: 7 } },
      ]),
    ).toEqual({ ok: false, reason: 'fairness' });
  });
});
