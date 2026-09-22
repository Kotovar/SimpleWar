import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAP_PRESETS, TEMP_START_SEED } from '@shared/config';

type MapGenerationMode = 'random' | 'fixed';

type SettingsState = {
  gridColumns: number;
  gridRows: number;

  seed?: number;
  mapGenerationMode: MapGenerationMode;
  customSeed: number;

  setMapGenerationMode: (mode: MapGenerationMode) => void;
  setCustomSeed: (seed: number) => void;
  setGridSize: (columns: number, rows: number) => void;
  resetStore: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  immer(set => ({
    gridColumns: MAP_PRESETS.large.cols,
    gridRows: MAP_PRESETS.large.rows,

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

    setGridSize: (columns: number, rows: number) =>
      set(state => {
        state.gridColumns = columns;
        state.gridRows = rows;
      }),

    resetStore: () => {
      set(state => {
        state.gridColumns = MAP_PRESETS.large.cols;
        state.gridRows = MAP_PRESETS.large.rows;

        state.customSeed = TEMP_START_SEED;
      });
    },
  })),
);
