import { describe, expect, it } from 'vite-plus/test';
import PF from 'pathfinding';
import { getReachableCells } from './getReachableCells';

describe('getReachableCells', () => {
  it('обходит препятствие и не включает стартовую клетку', () => {
    const grid = new PF.Grid([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]);

    const cells = getReachableCells(grid, 0, 0, 2);
    expect(cells).toHaveLength(4);
    expect(cells).toEqual(
      expect.arrayContaining([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 2, y: 0 },
        { x: 0, y: 2 },
      ]),
    );
    expect(grid.isWalkableAt(1, 1)).toBe(false);
  });

  it('учитывает диагональные переходы', () => {
    const grid = new PF.Grid(2, 2);

    expect(getReachableCells(grid, 0, 0, 1)).toHaveLength(2);
    expect(getReachableCells(grid, 0, 0, 1, true)).toHaveLength(3);
  });

  it('отклоняет недопустимый старт или лимит', () => {
    const grid = new PF.Grid(2, 2);

    expect(getReachableCells(grid, -1, 0, 1)).toEqual([]);
    expect(getReachableCells(grid, 0.5, 0, 1)).toEqual([]);
    expect(getReachableCells(grid, 0, 0, 0)).toEqual([]);
    expect(getReachableCells(grid, 0, 0, Number.NaN)).toEqual([]);
  });
});
