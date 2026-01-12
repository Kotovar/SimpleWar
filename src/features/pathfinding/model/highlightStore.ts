import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cell, Position } from '@shared/config';

import { useMapStore } from '@entities/maps';
import { getCellsAround } from '@features/pathfinding';
import { useBuildingsStore } from '@entities/buildings';

interface HighlightState {
  spawnableCells: Position[] | null;

  calculateSpawnableCells: (buildingId: string, cellType: Cell['type']) => void;

  resetStore: () => void;
}

export const useHighlightStore = create<HighlightState>()(
  immer(set => ({
    spawnableCells: null,

    calculateSpawnableCells: (buildingId, cellType) => {
      const building = useBuildingsStore.getState().buildings[buildingId];

      if (!building) return;

      const grid = useMapStore.getState().grid;

      const spawnable = getCellsAround(grid, building.x, building.y, cellType);

      set(state => {
        state.spawnableCells = spawnable;
      });
    },

    resetStore: () => {
      set(state => {
        state.spawnableCells = null;
      });
    },
  })),
);
