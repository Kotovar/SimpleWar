import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAP_PRESETS, TEMP_START_SEED } from '@shared/config';

type MapGenerationMode = 'random' | 'fixed';

type SettingsState = {
  canvasWidth: number;
  canvasHeight: number;

  gridColumns: number;
  gridRows: number;

  seed?: number;
  mapGenerationMode: MapGenerationMode;
  customSeed: number;

  setMapGenerationMode: (mode: MapGenerationMode) => void;
  setCustomSeed: (seed: number) => void;
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

    mapGenerationMode: 'random',
    customSeed: TEMP_START_SEED,

    setMapGenerationMode: mode =>
      set(state => {
        state.mapGenerationMode = mode;
      }),

    setCustomSeed: seed =>
      set(state => {
        state.customSeed = seed;
      }),

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

        state.customSeed = TEMP_START_SEED;
      });
    },
  })),
);
