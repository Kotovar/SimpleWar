import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import {
  getReachableCells,
  createMovementPFGrid,
  getAttackableTargets,
} from '../lib';

interface MovementState {
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;

  calculateMovement: (unitId: string) => void;
  resetStore: () => void;
}

export const useMovementStore = create<MovementState>()(
  immer(set => ({
    reachableCells: null,
    attackableTargets: null,

    // Для юнита считает клетки движения и цели; для боевого здания — только цели.
    calculateMovement: unitId => {
      const { units } = useUnitsStore.getState();
      const unit = units[unitId];
      const entity =
        unitId in units ? unit : useBuildingsStore.getState().buildings[unitId];
      if (!entity) return;

      const grid = useMapStore.getState().grid;
      const reachable = unit
        ? getReachableCells(
            createMovementPFGrid(grid),
            unit.x,
            unit.y,
            unit.movePoints,
          )
        : null;

      const attackable =
        (entity.role === 'military' || entity.role === 'combat') &&
        entity.attackPoints > 0
          ? getAttackableTargets(entity, entity.attackRange, entity.owner).map(
              enemy => ({ x: enemy.x, y: enemy.y }),
            )
          : null;

      set(state => {
        state.reachableCells = reachable;
        state.attackableTargets = attackable;
      });
    },

    resetStore: () => {
      set(state => {
        state.reachableCells = null;
        state.attackableTargets = null;
      });
    },
  })),
);
