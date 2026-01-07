import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { BUILDINGS_CONFIG } from '@shared/config';
import type { Owner, BuildingType, Building } from '@shared/config';

type BuildingsState = {
  buildings: Record<string, Building>;

  spawnBuilding: (
    type: BuildingType,
    x: number,
    y: number,
    owner: Owner,
  ) => string | null;
  damageBuilding: (id: string, damage: number) => void;
  getBuildingAt: (x?: number, y?: number) => Building | null;
  resetBuildingsForNewTurn: () => void;
  changeAttackPoints: (id: string) => void;
};

export const useBuildingsStore = create<BuildingsState>()(
  immer((set, get) => ({
    buildings: {},
    selectedBuildingId: null,

    spawnBuilding: (type, x, y, owner) => {
      const id = `building_${crypto.randomUUID()}`;
      const config = BUILDINGS_CONFIG[type];

      set(state => {
        state.buildings[id] = {
          id,
          type,
          x,
          y,
          owner,
          hp: config.maxHp,
          maxHp: config.maxHp,
          attack: config.attack ?? 0,
          attackRange: config.attackRange ?? 0,
          attackPoints: config.attackPoints ?? 0, // ← вот так безопаснее
          maxAttackPoints: config.attackPoints ?? 0,
        };
      });

      return id;
    },

    damageBuilding: (id: string, damage: number) => {
      set(state => {
        const building = state.buildings[id];
        const resultHP = building.hp - damage;

        if (resultHP > 0) {
          building.hp = resultHP;
        } else {
          delete state.buildings[id];
        }
      });
    },

    getBuildingAt: (x, y) => {
      return (
        Object.values(get().buildings).find(
          building => building.x === x && building.y === y,
        ) || null
      );
    },

    resetBuildingsForNewTurn: () =>
      set(state => {
        Object.values(state.buildings).forEach(building => {
          if (
            building.maxAttackPoints !== undefined &&
            building.maxAttackPoints > 0
          ) {
            building.attackPoints = building.maxAttackPoints;
          }
        });
      }),

    changeAttackPoints: (id: string) => {
      set(state => {
        const building = state.buildings[id];
        if (!building) return;

        if (building.attackPoints !== undefined && building.attackPoints > 0) {
          building.attackPoints--;
        }
      });
    },
  })),
);
