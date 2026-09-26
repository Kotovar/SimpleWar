import { describe, expect, it } from 'vite-plus/test';
import { getReachableCells } from './getReachableCells';

describe('getReachableCells', () => {
  it('обходит препятствие и не включает стартовую клетку', () => {
    const grid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];

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
  });

  it('не пускает на холм, если осталось меньше двух очков', () => {
    const grid = [[1, 1, 2]];

    expect(getReachableCells(grid, 0, 0, 2)).toEqual([{ x: 1, y: 0 }]);
    expect(getReachableCells(grid, 0, 0, 3)).toHaveLength(2);
  });

  it('не ходит по диагонали', () => {
    expect(
      getReachableCells(
        [
          [1, 0],
          [0, 1],
        ],
        0,
        0,
        4,
      ),
    ).toEqual([]);
  });

  it('отклоняет недопустимый старт или лимит', () => {
    const grid = [
      [1, 1],
      [1, 1],
    ];

    expect(getReachableCells(grid, -1, 0, 1)).toEqual([]);
    expect(getReachableCells(grid, 0.5, 0, 1)).toEqual([]);
    expect(getReachableCells(grid, 0, 0, 0)).toEqual([]);
    expect(getReachableCells(grid, 0, 0, Number.NaN)).toEqual([]);
  });
});
