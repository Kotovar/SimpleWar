import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gameEvents } from '@shared/lib';
import type { Owner, Unit, UnitType } from '@shared/config';
import { createUnit } from './createUnit';

type UnitsState = {
  units: Record<string, Unit>;
  selectedUnitForSpawn: UnitType | null;

  spawnUnit: (
    type: UnitType,
    x: number,
    y: number,
    owner: Owner,
    initialSpawn?: boolean,
  ) => string | null;
  moveUnit: (id: string, x: number, y: number, cost: number) => void;
  getUnitAt: (x?: number, y?: number) => Unit | null;
  damageUnit: (id: string, damage: number) => void;
  changeAttackPoints: (id: string) => void;
  changeBuildPoints: (id: string) => void;
  selectUnitForSpawn: (unitType: UnitType) => void;
  clearSelectedUnitForSpawn: () => void;
  resetUnitsForNewTurn: () => void;
  resetStore: () => void;
};

export const useUnitsStore = create<UnitsState>()(
  immer((set, get) => ({
    units: {},
    selectedUnitForSpawn: null,

    spawnUnit: (type, x, y, owner, initialSpawn = false) => {
      const unit = createUnit(type, x, y, owner, initialSpawn);
      if (!unit) return null;

      set(state => {
        state.units[unit.id] = unit;
      });

      gameEvents.emit({ type: 'UNIT_SPAWNED', unit, owner });

      return unit.id;
    },

    moveUnit: (id, x, y, cost) =>
      set(state => {
        const unit = state.units[id];
        if (!unit) return;

        if (!Number.isInteger(cost) || cost <= 0 || cost > unit.movePoints)
          return;

        unit.x = x;
        unit.y = y;
        unit.movePoints -= cost;
      }),

    damageUnit: (id, damage) => {
      const unit = get().units[id];
      if (!unit) return;

      const hp = unit.hp - damage;

      set(state => {
        if (hp > 0) state.units[id].hp = hp;
        else delete state.units[id];
      });

      if (hp <= 0) {
        gameEvents.emit({ type: 'UNIT_DESTROYED', unit, owner: unit.owner });
      }
    },

    getUnitAt: (x, y) => {
      return (
        Object.values(get().units).find(unit => unit.x === x && unit.y === y) ??
        null
      );
    },

    changeAttackPoints: id => {
      set(state => {
        const unit = state.units[id];
        if (unit?.role === 'military' && unit.attackPoints > 0) {
          unit.attackPoints--;
          if (unit.attackPoints === 0) unit.movePoints = 0;
        }
      });
    },

    changeBuildPoints: id => {
      set(state => {
        const unit = state.units[id];
        if (unit?.role === 'civil' && unit.buildPoints > 0) {
          unit.buildPoints--;
          if (unit.buildPoints === 0) unit.movePoints = 0;
        }
      });
    },

    selectUnitForSpawn: unitType => {
      set(state => {
        state.selectedUnitForSpawn = unitType;
      });
    },

    clearSelectedUnitForSpawn: () => {
      set(state => {
        state.selectedUnitForSpawn = null;
      });
    },

    resetUnitsForNewTurn: () =>
      set(state => {
        Object.values(state.units).forEach(unit => {
          unit.movePoints = unit.maxMovePoints;

          if (unit.role === 'military') {
            unit.attackPoints = unit.maxAttackPoints;
          } else {
            unit.buildPoints = unit.maxBuildPoints;
          }
        });
      }),

    resetStore: () => {
      set(state => {
        state.units = {};
        state.selectedUnitForSpawn = null;
      });
    },
  })),
);
