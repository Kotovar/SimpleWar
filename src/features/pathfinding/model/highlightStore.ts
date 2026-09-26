import { create } from 'zustand';
import { gameEvents, withDevtools } from '@shared/lib';
import type { Cell, Position } from '@shared/config';

import { useMapStore } from '@entities/maps';
import { getCellsAround } from '../lib/getCellsAround';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';

interface HighlightState {
  spawnableCells: Position[] | null;
  buildableCells: Position[] | null;
  /** Клетки леса для расчистки; не `null` — включён режим расчистки. */
  clearableCells: Position[] | null;

  calculateSpawnableCells: (buildingId: string, cellType: Cell['type']) => void;
  /**
   * Клетки для стройки рядом с рабочим. `allow` отсеивает клетки по
   * правилам команды, например перекрытие последнего прохода.
   */
  calculateBuildableCells: (
    unitId: string,
    cellType: Cell['type'],
    allow?: (cell: Position) => boolean,
  ) => void;
  setClearableCells: (cells: Position[] | null) => void;

  resetStore: () => void;
}

export const useHighlightStore = create<HighlightState>()(
  withDevtools('highlight', set => ({
    spawnableCells: null,
    buildableCells: null,
    clearableCells: null,

    calculateSpawnableCells: (buildingId, cellType) => {
      const building = useBuildingsStore.getState().buildings[buildingId];

      if (!building) return;

      const grid = useMapStore.getState().grid;

      const spawnable = getCellsAround(grid, building.x, building.y, cellType);

      set(state => {
        state.spawnableCells = spawnable;
      });
    },

    calculateBuildableCells: (unitId, cellType, allow) => {
      const unit = useUnitsStore.getState().units[unitId];

      if (!unit) return;

      const grid = useMapStore.getState().grid;

      const buildable = getCellsAround(grid, unit.x, unit.y, cellType).filter(
        cell => !allow || allow(cell),
      );

      set(state => {
        state.buildableCells = buildable;
      });
    },

    setClearableCells: cells =>
      set(state => {
        state.clearableCells = cells;
      }),

    resetStore: () => {
      set(state => {
        state.spawnableCells = null;
        state.buildableCells = null;
        state.clearableCells = null;
      });
    },
  })),
);

gameEvents.subscribe(event => {
  if (event.type === 'GAME_RESET') useHighlightStore.getState().resetStore();
});
