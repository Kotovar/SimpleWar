import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gameEvents } from '@shared/lib';
import type { Owner, Unit, Player, UnitType } from '@shared/config';
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
  moveUnit: (id: string, x: number, y: number) => void;
  getUnitAt: (x?: number, y?: number) => Unit | null;
  getUnits: (owner: Player) => Unit[];
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

    getUnits: owner =>
      Object.values(get().units).filter(unit => unit.owner === owner),

    moveUnit: (id, x, y) =>
      set(state => {
        const unit = state.units[id];
        if (!unit) return;

        const dist = Math.abs(unit.x - x) + Math.abs(unit.y - y);

        if (dist > unit.movePoints) return;

        if (unit) {
          unit.x = x;
          unit.y = y;
          unit.movePoints -= dist;
        }
      }),

    damageUnit: (id, damage) => {
      const unitBefore = get().units[id];
      if (!unitBefore) return;

      let destroyed = false;

      set(state => {
        const unit = state.units[id];
        if (!unit) return;

        const resultHP = unit.hp - damage;

        if (resultHP > 0) {
          unit.hp = resultHP;
        } else {
          destroyed = true;
          delete state.units[id];
        }
      });

      if (destroyed) {
        gameEvents.emit({
          type: 'UNIT_DESTROYED',
          unit: unitBefore,
          owner: unitBefore.owner,
        });
      }
    },

    getUnitAt: (x, y) => {
      const units = Object.values(get().units);
      return units.find(unit => unit.x === x && unit.y === y) || null;
    },

    changeAttackPoints: id => {
      set(state => {
        const unit = state.units[id];
        if (!unit || unit.role === 'civil') return;

        if (unit.attackPoints > 0) {
          unit.attackPoints--;

          if (unit.attackPoints === 0) {
            unit.movePoints = 0;
          }
        }
      });
    },

    changeBuildPoints: (id: string) => {
      set(state => {
        const unit = state.units[id];
        if (!unit || unit.role !== 'civil') return;

        if (unit.buildPoints > 0) {
          unit.buildPoints--;

          if (unit.buildPoints === 0) {
            unit.movePoints = 0;
          }
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

          if (unit.role !== 'civil') {
            unit.attackPoints = unit.maxAttackPoints;
          }

          if (unit.role === 'civil') {
            unit.buildPoints = unit.maxBuildPoints;
          }
        });
      }),

    resetStore: () => {
      set(state => {
        state.units = {};
      });
    },
  })),
);
