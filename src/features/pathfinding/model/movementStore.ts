import { create } from 'zustand';
import { gameEvents, withDevtools } from '@shared/lib';
import type { Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import {
  getReachableCells,
  createKnownMovementGrid,
  TURN_UNKNOWN_COST,
  getAttackableTargets,
} from '../lib';

interface MovementState {
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;

  calculateActionHighlights: (unitId: string) => void;
  resetStore: () => void;
}

export const useMovementStore = create<MovementState>()(
  withDevtools('movement', set => ({
    reachableCells: null,
    attackableTargets: null,

    // Для юнита считает клетки движения и цели атаки; для башни — только цели.
    calculateActionHighlights: unitId => {
      const { units } = useUnitsStore.getState();
      const unit = units[unitId];
      const entity =
        unitId in units ? unit : useBuildingsStore.getState().buildings[unitId];
      if (!entity) return;

      // Клетки движения — по известной владельцу карте: скрытые юниты
      // и скрытые изменения рельефа подсветку не меняют.
      const reachable = unit
        ? getReachableCells(
            createKnownMovementGrid(unit.owner, TURN_UNKNOWN_COST),
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

gameEvents.subscribe(event => {
  if (event.type === 'GAME_RESET') useMovementStore.getState().resetStore();
});
