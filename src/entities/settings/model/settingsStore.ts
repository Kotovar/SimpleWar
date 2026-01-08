import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAP_PRESETS } from '@shared/config';

type SettingsState = {
  canvasWidth: number;
  canvasHeight: number;

  gridColumns: number;
  gridRows: number;

  setCanvasSize: (width: number, height: number) => void;
  setGridSize: (columns: number, rows: number) => void;
  resetStore: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  immer(set => ({
    canvasWidth: MAP_PRESETS.large.canvas.w,
    canvasHeight: MAP_PRESETS.large.canvas.h,

    gridColumns: MAP_PRESETS.large.grid.cols,
    gridRows: MAP_PRESETS.large.grid.rows,

    setCanvasSize: (width: number, height: number) =>
      set(state => {
        state.canvasWidth = width;
        state.canvasHeight = height;
      }),

    setGridSize: (columns: number, rows: number) =>
      set(state => {
        state.gridColumns = columns;
        state.gridRows = rows;
      }),

    resetStore: () => {
      set(state => {
        state.canvasWidth = MAP_PRESETS.large.canvas.w;
        state.canvasHeight = MAP_PRESETS.large.canvas.h;

        state.gridColumns = MAP_PRESETS.large.grid.cols;
        state.gridRows = MAP_PRESETS.large.grid.rows;
      });
    },
  })),
);
