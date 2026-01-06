import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cell } from '@shared/config';
import { generateMap } from './generateMap';

type MapState = {
  grid: Cell[][];
  size: number;

  initMap: (size: number, seed?: number) => void;
  getCell: (x: number, y: number) => Cell | null;
  setCell: (x: number, y: number, newCell: Partial<Cell>) => void;
};

export const useMapStore = create<MapState>()(
  immer((set, get) => ({
    grid: [],
    size: 0,

    initMap: (size, seed?: number) =>
      set(state => {
        state.grid = generateMap(size, seed);
        state.size = size;
      }),

    getCell: (x, y) => {
      const state = get();
      if (x < 0 || x >= state.size || y < 0 || y >= state.size) {
        return null;
      }

      return state.grid[y][x];
    },

    setCell: (x: number, y: number, newCell: Partial<Cell>) =>
      set(state => {
        if (!state.grid[y] || !state.grid[y][x]) return;
        state.grid[y][x] = { ...state.grid[y][x], ...newCell };
      }),
  })),
);
