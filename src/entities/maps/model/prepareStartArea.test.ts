import { describe, expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { prepareStartArea } from './prepareStartArea';

const waterGrid = (width: number, height: number): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'water' as const,
      isWalkable: false,
    })),
  );

describe('prepareStartArea', () => {
  it('превращает квадрат 3 × 3 вокруг базы в проходимую траву', () => {
    const grid = waterGrid(5, 5);

    prepareStartArea(grid, 2, 2);

    expect(grid[1][1]).toMatchObject({ type: 'grass', isWalkable: true });
    expect(grid[2][2]).toMatchObject({ type: 'grass', isWalkable: true });
    expect(grid[3][3]).toMatchObject({ type: 'grass', isWalkable: true });
    expect(grid[0][0]).toMatchObject({ type: 'water', isWalkable: false });
  });

  it('работает у края карты, ограничиваясь существующими клетками', () => {
    const grid = waterGrid(2, 2);

    expect(() => prepareStartArea(grid, 0, 0)).not.toThrow();
    expect(grid.flat()).toEqual(
      waterGrid(2, 2)
        .flat()
        .map(cell => ({ ...cell, type: 'grass', isWalkable: true })),
    );
  });
});
