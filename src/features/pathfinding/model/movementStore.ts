import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Cell, Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import {
  getReachableCells,
  createMovementPFGrid,
  getAttackableTargets,
  getCellsAround,
} from '@features/pathfinding';

interface MovementState {
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;
  buildableCells: Position[] | null;
  currentPath: Position[] | null;

  calculateMovement: (unitId: string) => void;
  calculateBuildableCells: (unitId: string, cellType: Cell['type']) => void;

  resetStore: () => void;
}

export const useMovementStore = create<MovementState>()(
  immer(set => ({
    reachableCells: null,
    attackableTargets: null,
    buildableCells: null,
    currentPath: null,

    calculateMovement: unitId => {
      const unit = useUnitsStore.getState().units[unitId];
      if (!unit) return;

      const grid = useMapStore.getState().grid;
      const pfGrid = createMovementPFGrid(grid);

      const reachable = getReachableCells(
        pfGrid,
        unit.x,
        unit.y,
        unit.movePoints,
      );

      const attackable =
        unit.role === 'military' && unit.attackPoints > 0
          ? getAttackableTargets(
              { x: unit.x, y: unit.y },
              unit.attackRange,
            ).map(enemy => ({ x: enemy.x, y: enemy.y }))
          : null;

      set(state => {
        state.reachableCells = reachable;
        state.attackableTargets = attackable;
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
        state.reachableCells = null;
        state.attackableTargets = null;
        state.buildableCells = null;
        state.currentPath = null;
      });
    },
  })),
);
