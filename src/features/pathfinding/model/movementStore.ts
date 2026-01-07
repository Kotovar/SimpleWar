import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import {
  getReachableCells,
  createMovementPFGrid,
  getAttackableTargets,
} from '@features/pathfinding/lib';

interface MovementState {
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;
  currentPath: Position[] | null;

  calculateMovement: (unitId: string) => void;
  clearMovement: () => void;
}

export const useMovementStore = create<MovementState>()(
  immer(set => ({
    reachableCells: null,
    attackableTargets: null,
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
        unit.attackPoints > 0
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

    clearMovement: () =>
      set({
        reachableCells: null,
        attackableTargets: null,
      }),
  })),
);
