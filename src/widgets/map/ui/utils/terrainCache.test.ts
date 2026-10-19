import { describe, expect, it } from 'vite-plus/test';
import type { Cell, CellType } from '@shared/config';
import { dirtyTiles } from './terrainCache';

const map = (width: number, height: number, type: CellType = 'grass') =>
  Array.from({ length: height }, (_, y) =>
    Array.from(
      { length: width },
      (_, x): Cell => ({ x, y, type, isWalkable: true }),
    ),
  );

const range = { x0: 0, y0: 0, x1: 24, y1: 16 };

describe('dirtyTiles', () => {
  it('та же местность и площадки — перерисовывать нечего', () => {
    const grid = map(24, 16);
    const copy = grid.map(row => row.map(cell => ({ ...cell })));
    const built = new Set(['3,3']);

    expect(
      dirtyTiles({ range, grid, builtCells: built }, copy, new Set(built)).tiles
        .size,
    ).toBe(0);
  });

  it('изменение в глубине тайла метит только его', () => {
    const grid = map(24, 16);
    const next = grid.map(row => row.map(cell => ({ ...cell })));
    next[4][12] = { ...next[4][12], type: 'forest' };

    const { tiles, columns, total } = dirtyTiles(
      { range, grid, builtCells: new Set() },
      next,
      new Set(),
    );

    expect([...tiles]).toEqual([1]);
    expect(columns).toBe(3);
    expect(total).toBe(6);
  });

  it('изменение у края тайла метит и соседние: берега зависят от соседей', () => {
    const grid = map(24, 16);
    const next = grid.map(row => row.map(cell => ({ ...cell })));
    next[7][7] = { ...next[7][7], type: 'water' };

    const { tiles } = dirtyTiles(
      { range, grid, builtCells: new Set() },
      next,
      new Set(),
    );

    expect([...tiles].sort((a, b) => a - b)).toEqual([0, 1, 3, 4]);
  });

  it('тайлы считаются от края кэша, изменение за краем метит граничный', () => {
    const grid = map(40, 32);
    const next = grid.map(row => row.map(cell => ({ ...cell })));
    // Кэш с x0 = 8: клетка 7 — за его левым краем, влияет на клетку 8.
    next[12][7] = { ...next[12][7], type: 'water' };
    const shifted = { x0: 8, y0: 8, x1: 32, y1: 24 };

    const { tiles, columns } = dirtyTiles(
      { range: shifted, grid, builtCells: new Set() },
      next,
      new Set(),
    );

    expect(columns).toBe(3);
    expect([...tiles]).toEqual([0]);
  });

  it('новая площадка под зданием тоже метит тайл', () => {
    const grid = map(24, 16);

    const { tiles } = dirtyTiles(
      { range, grid, builtCells: new Set() },
      grid,
      new Set(['20,12']),
    );

    expect([...tiles]).toEqual([5]);
  });
});
