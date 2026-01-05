import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { UNITS_CONFIG } from '@shared/config';
import type { Owner, UnitType } from '@shared/config';

export type Unit = {
  id: string;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moveRange: number;
  attack: number;
  owner: Owner;
};

type UnitsState = {
  units: Record<string, Unit>;

  spawnUnit: (
    type: UnitType,
    x: number,
    y: number,
    owner: Owner,
  ) => string | null;
  moveUnit: (id: string, x: number, y: number) => void;
  getUnitAt: (x?: number, y?: number) => Unit | null;
};

export const useUnitsStore = create<UnitsState>()(
  immer((set, get) => ({
    units: {},
    selectedUnitId: null,

    spawnUnit: (type: UnitType, x: number, y: number, owner: Owner) => {
      const id = `${type}_${crypto.randomUUID()}`;
      const config = UNITS_CONFIG[type];

      set(state => {
        state.units[id] = {
          id,
          type,
          x,
          y,
          owner,
          hp: config.maxHp,
          maxHp: config.maxHp,
          moveRange: config.moveRange,
          attack: config.attack,
        };
      });

      return id;
    },

    moveUnit: (id, x, y) =>
      set(state => {
        const unit = state.units[id];
        if (unit) {
          unit.x = x;
          unit.y = y;
        }
      }),

    getUnitAt: (x, y) => {
      const units = Object.values(get().units);
      return units.find(unit => unit.x === x && unit.y === y) || null;
    },
  })),
);
