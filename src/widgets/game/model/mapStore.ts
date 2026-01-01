import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateInitialMap } from './generateMap';
import type { Cell } from './types';

export type MapState = {
  grid: Cell[][];
  size: number;
  initMap: (size: number, seed?: number) => void;
  getCell: (x: number, y: number) => Cell | undefined;
  setUnit: (x: number, y: number, unitId: string | null) => void;
  // findPath: (from: {x,y}, to: {x,y}) => {x,y}[] | null;
};

export const useMapStore = create<MapState>()(
  immer((set, get) => ({
    grid: [],
    size: 0,

    initMap: (size, seed?: number) =>
      set(state => {
        state.grid = generateInitialMap(size, seed);
        state.size = size;
      }),

    getCell: (x, y) => {
      const state = get();
      if (x < 0 || x >= state.size || y < 0 || y >= state.size) {
        return undefined;
      }

      return state.grid[y][x];
    },

    setUnit: (x, y, unitId) =>
      set(state => {
        if (
          x < 0 ||
          x >= state.size ||
          y < 0 ||
          y >= state.size ||
          !state.grid[y][x].isWalkable
        ) {
          return;
        }

        state.grid[y][x].unitId = unitId;
      }),
  })),
);
