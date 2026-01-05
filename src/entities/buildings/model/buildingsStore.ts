import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { BUILDINGS_CONFIG } from '@shared/config';
import type { Owner, BuildingType } from '@shared/config';

export type Building = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: Owner;
};

type BuildingsState = {
  buildings: Record<string, Building>;

  spawnBuilding: (
    type: BuildingType,
    x: number,
    y: number,
    owner: Owner,
  ) => string | null;
  getBuildingAt: (x?: number, y?: number) => Building | null;
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
        };
      });

      return id;
    },

    getBuildingAt: (x, y) => {
      return (
        Object.values(get().buildings).find(
          building => building.x === x && building.y === y,
        ) || null
      );
    },
  })),
);
