import { create } from 'zustand';
import { gameEvents, withDevtools } from '@shared/lib';
import type { Cell, Position } from '@shared/config';

import { useMapStore } from '@entities/maps';
import { getCellsAround } from '../lib/getCellsAround';
import { useBuildingsStore } from '@entities/buildings';

interface HighlightState {
  spawnableCells: Position[] | null;
  buildableCells: Position[] | null;
  /** Клетки леса для расчистки; не `null` — включён режим расчистки. */
  clearableCells: Position[] | null;
  /** Клетки для подготовленного удара осады; не `null` — режим прицела. */
  strikeCells: Position[] | null;

  calculateSpawnableCells: (buildingId: string, cellType: Cell['type']) => void;
  /** Клетки, где можно заложить здание; не `null` — режим выбора места. */
  setBuildableCells: (cells: Position[] | null) => void;
  setClearableCells: (cells: Position[] | null) => void;
  setStrikeCells: (cells: Position[] | null) => void;

  resetStore: () => void;
}

export const useHighlightStore = create<HighlightState>()(
  withDevtools('highlight', set => ({
    spawnableCells: null,
    buildableCells: null,
    clearableCells: null,
    strikeCells: null,

    calculateSpawnableCells: (buildingId, cellType) => {
      const building = useBuildingsStore.getState().buildings[buildingId];

      if (!building) return;

      const grid = useMapStore.getState().grid;

      const spawnable = getCellsAround(grid, building.x, building.y, cellType);

      set(state => {
        state.spawnableCells = spawnable;
      });
    },

    setBuildableCells: cells =>
      set(state => {
        state.buildableCells = cells;
      }),

    setClearableCells: cells =>
      set(state => {
        state.clearableCells = cells;
      }),

    setStrikeCells: cells =>
      set(state => {
        state.strikeCells = cells;
      }),

    resetStore: () => {
      set(state => {
        state.spawnableCells = null;
        state.buildableCells = null;
        state.clearableCells = null;
        state.strikeCells = null;
      });
    },
  })),
);

gameEvents.subscribe(event => {
  if (event.type === 'GAME_RESET') useHighlightStore.getState().resetStore();
});
