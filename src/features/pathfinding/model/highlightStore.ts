import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cell, Position } from '@shared/config';

import { useMapStore } from '@entities/maps';
import { getCellsAround } from '@features/pathfinding';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';

interface HighlightState {
  spawnableCells: Position[] | null;
  buildableCells: Position[] | null;

  calculateSpawnableCells: (buildingId: string, cellType: Cell['type']) => void;
  calculateBuildableCells: (unitId: string, cellType: Cell['type']) => void;

  resetStore: () => void;
}

export const useHighlightStore = create<HighlightState>()(
  immer(set => ({
    spawnableCells: null,
    buildableCells: null,

    calculateSpawnableCells: (buildingId, cellType) => {
      const building = useBuildingsStore.getState().buildings[buildingId];

      if (!building) return;

      const grid = useMapStore.getState().grid;

      const spawnable = getCellsAround(grid, building.x, building.y, cellType);

      set(state => {
        state.spawnableCells = spawnable;
      });
    },

    calculateBuildableCells: (unitId, cellType) => {
      const unit = useUnitsStore.getState().units[unitId];

      if (!unit) return;

      const grid = useMapStore.getState().grid;

      const buildable = getCellsAround(grid, unit.x, unit.y, cellType);

      set(state => {
        state.buildableCells = buildable;
      });
    },

    resetStore: () => {
      set(state => {
        state.spawnableCells = null;
        state.buildableCells = null;
      });
    },
  })),
);
