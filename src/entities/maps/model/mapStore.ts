import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cell } from '@shared/config';

type MapState = {
  grid: Cell[][];

  /**
   * Заменяет карту целиком.
   *
   * Стор не импортирует генератор: иначе при HMR правка генератора
   * пересоздаёт модуль стора, и карта в открытой игре пропадает.
   */
  setGrid: (grid: Cell[][]) => void;
  getCell: (x: number, y: number) => Cell | null;
  setCell: (x: number, y: number, newCell: Partial<Cell>) => void;
  resetStore: () => void;
};

export const useMapStore = create<MapState>()(
  immer((set, get) => ({
    grid: [],

    setGrid: grid => set({ grid }),

    getCell: (x, y) => get().grid[y]?.[x] ?? null,

    setCell: (x, y, newCell) =>
      set(state => {
        const cell = state.grid[y]?.[x];
        if (cell) Object.assign(cell, newCell);
      }),

    resetStore: () => set({ grid: [] }),
  })),
);
