import { create } from 'zustand';
import { gameEvents, withDevtools } from '@shared/lib';
import { HEALING, type Position, type Unit } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import {
  TURN_UNKNOWN_COST,
  getAttackableTargets,
  getUnitReachableCells,
} from '../lib';

interface MovementState {
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;
  /** Свои раненые юниты, которых выбранный лекарь может вылечить. */
  healTargets: Unit[] | null;
  /**
   * Далёкая цель юнита после первого клика: второй клик тем же юнитом
   * отдаёт приказ «Идти в точку». Другому юниту отметка не переходит.
   */
  plannedTarget: (Position & { unitId: string }) | null;

  setPlannedTarget: (target: MovementState['plannedTarget']) => void;
  calculateActionHighlights: (unitId: string) => void;
  resetStore: () => void;
}

export const useMovementStore = create<MovementState>()(
  withDevtools('movement', set => ({
    reachableCells: null,
    attackableTargets: null,
    healTargets: null,
    plannedTarget: null,

    setPlannedTarget: target =>
      set(state => {
        state.plannedTarget = target;
      }),

    // Для юнита считает клетки движения и цели атаки; для башни — только цели.
    calculateActionHighlights: unitId => {
      const { units } = useUnitsStore.getState();
      const unit = units[unitId];
      const entity =
        unitId in units ? unit : useBuildingsStore.getState().buildings[unitId];
      if (!entity) return;

      // Клетки движения — по известной владельцу карте: скрытые юниты
      // и скрытые изменения рельефа подсветку не меняют.
      // Летающему — пролёт и посадка на свободную клетку.
      const reachable = unit
        ? getUnitReachableCells(unit, unit.owner, TURN_UNKNOWN_COST)
        : null;

      // Лекарь вместо атаки лечит своих раненых в дальности.
      const heal = unit?.role === 'military' && HEALING[unit.type];
      const healable =
        unit?.role === 'military' && heal && unit.attackPoints > 0
          ? Object.values(units).filter(
              other =>
                other.id !== unit.id &&
                other.owner === unit.owner &&
                other.hp < other.maxHp &&
                Math.abs(other.x - unit.x) + Math.abs(other.y - unit.y) <=
                  unit.attackRange,
            )
          : null;

      const attackable =
        (entity.role === 'military' || entity.role === 'combat') &&
        entity.type !== 'siege' &&
        entity.attack > 0 &&
        entity.attackPoints > 0
          ? getAttackableTargets(
              entity,
              entity.attackRange,
              entity.owner,
              entity.type,
            ).map(enemy => ({ x: enemy.x, y: enemy.y }))
          : null;

      set(state => {
        state.reachableCells = reachable;
        state.attackableTargets = attackable;
        state.healTargets = healable;
      });
    },

    resetStore: () => {
      set(state => {
        state.reachableCells = null;
        state.attackableTargets = null;
        state.healTargets = null;
        state.plannedTarget = null;
      });
    },
  })),
);

gameEvents.subscribe(event => {
  if (event.type === 'GAME_RESET') useMovementStore.getState().resetStore();
});
