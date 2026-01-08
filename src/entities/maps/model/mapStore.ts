import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cell } from '@shared/config';
import { generateMap } from './generateMap';

type MapState = {
  grid: Cell[][];
  width: number;
  height: number;

  initMap: (width: number, height: number, seed?: number) => void;
  getCell: (x: number, y: number) => Cell | null;
  setCell: (x: number, y: number, newCell: Partial<Cell>) => void;
  resetStore: () => void;
};

export const useMapStore = create<MapState>()(
  immer((set, get) => ({
    grid: [],
    width: 0,
    height: 0,

    initMap: (width, height, seed) =>
      set(state => {
        if (width <= 0 || height <= 0) {
          console.warn('Invalid map size:', width, height);
          return;
        }
        state.grid = generateMap(width, height, seed);
        state.width = width;
        state.height = height;
      }),

    getCell: (x, y) => {
      const state = get();
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
        return null;
      }

      return state.grid[y]?.[x] ?? null;
    },

    setCell: (x: number, y: number, newCell: Partial<Cell>) =>
      set(state => {
        if (!state.grid[y] || !state.grid[y][x]) return;
        state.grid[y][x] = { ...state.grid[y][x], ...newCell };
      }),

    resetStore: () => {
      set(state => {
        state.grid = [];
        state.width = 0;
        state.height = 0;
      });
    },
  })),
);
