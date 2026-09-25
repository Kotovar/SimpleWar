import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  CELL_SIZE,
  CELL_SIZE_LIMITS,
  MAP_PRESETS,
  TEMP_START_SEED,
} from '@shared/config';

type MapGenerationMode = 'random' | 'fixed';

type SettingsState = {
  gridColumns: number;
  gridRows: number;
  cellSize: number;

  mapGenerationMode: MapGenerationMode;
  customSeed: number;

  setMapGenerationMode: (mode: MapGenerationMode) => void;
  setCustomSeed: (seed: number) => void;
  setGridSize: (columns: number, rows: number) => void;
  zoomBy: (steps: number) => void;
  resetZoom: () => void;
  resetStore: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  immer(set => ({
    gridColumns: MAP_PRESETS.large.cols,
    gridRows: MAP_PRESETS.large.rows,
    cellSize: CELL_SIZE,

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

    zoomBy: steps =>
      set(state => {
        const { min, max, step } = CELL_SIZE_LIMITS;
        const next = state.cellSize * step ** steps;
        state.cellSize = Math.round(Math.min(max, Math.max(min, next)));
      }),

    resetZoom: () =>
      set(state => {
        state.cellSize = CELL_SIZE;
      }),

    setGridSize: (columns: number, rows: number) =>
      set(state => {
        state.gridColumns = columns;
        state.gridRows = rows;
      }),

    resetStore: () => {
      set(state => {
        state.gridColumns = MAP_PRESETS.large.cols;
        state.gridRows = MAP_PRESETS.large.rows;
        state.cellSize = CELL_SIZE;

        state.mapGenerationMode = 'random';
        state.customSeed = TEMP_START_SEED;
      });
    },
  })),
);
