import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CIVIL_UNITS_CONFIG, MILITARY_UNITS_CONFIG } from '@shared/config';
import type {
  Owner,
  Unit,
  MilitaryType,
  CivilType,
  Player,
} from '@shared/config';

type UnitsState = {
  units: Record<string, Unit>;

  spawnUnit: (
    type: MilitaryType | CivilType,
    x: number,
    y: number,
    owner: Owner,
  ) => string | null;
  moveUnit: (id: string, x: number, y: number) => void;
  getUnitAt: (x?: number, y?: number) => Unit | null;
  getUnits: (owner: Player) => Unit[];
  damageUnit: (id: string, damage: number) => void;
  changeAttackPoints: (id: string) => void;
  changeBuildPoints: (id: string) => void;
  resetUnitsForNewTurn: () => void;
  resetStore: () => void;
};

export const useUnitsStore = create<UnitsState>()(
  immer((set, get) => ({
    units: {},

    spawnUnit: (type, x, y, owner) => {
      const id = `${type}_${crypto.randomUUID()}`;

      set(state => {
        if (type in MILITARY_UNITS_CONFIG) {
          const config = MILITARY_UNITS_CONFIG[type as MilitaryType];

          state.units[id] = {
            id,
            type,
            x,
            y,
            owner,
            hp: config.maxHp,
            maxHp: config.maxHp,
            movePoints: config.movePoints,
            maxMovePoints: config.movePoints,
            attack: config.attack,
            attackPoints: config.maxAttackPoints,
            maxAttackPoints: config.maxAttackPoints,
            attackRange: config.attackRange,
            requiresLimit: config.requiresLimit,
            role: 'military',
          };
        } else if (type in CIVIL_UNITS_CONFIG) {
          const config = CIVIL_UNITS_CONFIG[type as CivilType];

          state.units[id] = {
            id,
            type,
            x,
            y,
            owner,
            hp: config.maxHp,
            maxHp: config.maxHp,
            movePoints: config.movePoints,
            maxMovePoints: config.movePoints,
            buildPoints: config.buildPoints,
            maxBuildPoints: config.maxBuildPoints,
            canBuild: config.canBuild,
            buildableBuildings: config.buildableBuildings,
            requiresLimit: config.requiresLimit,
            role: 'civil',
          };
        }
      });

      return id;
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
      set(state => {
        const unit = state.units[id];

        if (!unit) return;

        const resultHP = unit.hp - damage;

        if (resultHP > 0) {
          unit.hp = resultHP;
        } else {
          delete state.units[id];
        }
      });
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
