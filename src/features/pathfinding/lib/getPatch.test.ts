import { describe, expect, it } from 'vite-plus/test';
import PF from 'pathfinding';
import { getPath } from './getPatch';

describe('getPath', () => {
  it('does not open a blocked destination', () => {
    const grid = new PF.Grid([[0, 1]]);
    expect(getPath({ x: 0, y: 0 }, { x: 1, y: 0 }, grid)).toEqual([]);
  });

  it('returns no path for coordinates outside the grid', () => {
    const grid = new PF.Grid([[0, 0]]);
    expect(getPath({ x: 0, y: 0 }, { x: 2, y: 0 }, grid)).toEqual([]);
  });

  it('finds a detour from an occupied start without changing the input grid', () => {
    const grid = new PF.Grid([
      [0, 0, 0],
      [1, 1, 0],
      [0, 0, 0],
    ]);
    const start = { x: 0, y: 1 };
    const end = { x: 2, y: 1 };
    expect(getPath(start, end, grid)).toHaveLength(5);
    expect(getPath(end, start, new PF.Grid(3, 3))).toHaveLength(3);
    expect(getPath({ x: 2, y: 0 }, { x: 0, y: 0 }, grid)).toHaveLength(3);
    expect(grid.isWalkableAt(0, 1)).toBe(false);
  });
});
