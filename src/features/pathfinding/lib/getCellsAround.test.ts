import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import type { Cell } from '@shared/config';
import { getCellsAround } from './getCellsAround';

beforeEach(() => {
  useUnitsStore.getState().resetStore();
  useBuildingsStore.getState().resetStore();
});

describe('getCellsAround', () => {
  it('keeps cells in bounds, filters occupants and honors the terrain filter', () => {
    const grid: Cell[][] = Array.from({ length: 3 }, (_, y) =>
      Array.from({ length: 3 }, (_, x) => ({
        x,
        y,
        type: 'grass' as const,
        isWalkable: true,
      })),
    );
    grid[0][1].type = 'forest';
    grid[1][0].type = 'forest';
    grid[1][2].type = 'forest';
    useUnitsStore.getState().spawnUnit('worker', 1, 0, 'p1');
    useBuildingsStore.getState().spawnBuilding('base', 0, 1, 'p1');

    expect(getCellsAround(grid, 0, 0)).toEqual([{ x: 1, y: 1 }]);
    expect(getCellsAround(grid, 1, 1, 'forest')).toEqual([{ x: 2, y: 1 }]);
  });
});
