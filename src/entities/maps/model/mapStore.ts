import { create } from 'zustand';
import { withDevtools } from '@shared/lib';
import type { Cell } from '@shared/config';

type MapState = {
  grid: Cell[][];
  seed: number | null;
  usedFallback: boolean;

  /**
   * Заменяет карту целиком.
   *
   * Стор не импортирует генератор: иначе при HMR правка генератора
   * пересоздаёт модуль стора, и карта в открытой игре пропадает.
   */
  setGrid: (
    grid: Cell[][],
    seed?: number | null,
    usedFallback?: boolean,
  ) => void;
  getCell: (x: number, y: number) => Cell | null;
  setCell: (
    x: number,
    y: number,
    newCell: Partial<Pick<Cell, 'type' | 'isWalkable'>>,
  ) => void;
  resetStore: () => void;
};

export const useMapStore = create<MapState>()(
  withDevtools('map', (set, get) => ({
    grid: [],
    seed: null,
    usedFallback: false,

    setGrid: (grid, seed = null, usedFallback = false) =>
      set({ grid, seed, usedFallback }),

    getCell: (x, y) => get().grid[y]?.[x] ?? null,

    setCell: (x, y, newCell) =>
      set(state => {
        const cell = state.grid[y]?.[x];
        if (cell) Object.assign(cell, newCell);
      }),

    resetStore: () => set({ grid: [], seed: null, usedFallback: false }),
  })),
);
