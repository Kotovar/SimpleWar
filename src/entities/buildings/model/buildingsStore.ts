import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { BUILDINGS_CONFIG } from '@shared/config';
import { gameEvents } from '@shared/lib';
import type { Owner, BuildingType, Building, Player } from '@shared/config';

export type BuildingsState = {
  buildings: Record<string, Building>;
  selectedBuildingForSpawn: BuildingType | null;

  spawnBuilding: (
    type: BuildingType,
    x: number,
    y: number,
    owner: Owner,
  ) => string | null;
  damageBuilding: (id: string, damage: number) => void;
  getBuildingAt: (x?: number, y?: number) => Building | null;
  getEconomicBuildings: (owner: Player) => Building[];
  getLimitBuildings: (owner: Player) => Building[];
  changeAttackPoints: (id: string) => void;
  checkBaseDestroyed: () => Player | null;
  selectBuildingForSpawn: (buildingType: BuildingType) => void;
  clearSelectedBuildingForSpawn: () => void;
  resetBuildingsForNewTurn: () => void;
  resetStore: () => void;
};

export const useBuildingsStore = create<BuildingsState>()(
  immer((set, get) => ({
    buildings: {},
    selectedBuildingForSpawn: null,

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
          income: config.income,
          hp: config.maxHp,
          maxHp: config.maxHp,
          cost: config.cost,
          attack: config.attack ?? 0,
          attackRange: config.attackRange ?? 0,
          attackPoints: config.attackPoints ?? 0,
          maxAttackPoints: config.attackPoints ?? 0,
          populationSupply: config.populationSupply ?? 0,
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

          gameEvents.emit({
            type: 'BUILDING_DESTROYED',
            building: building,
            owner: building.owner,
          });
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

    getEconomicBuildings: owner => {
      return Object.values(get().buildings).filter(
        building => building.owner === owner && building.income !== undefined,
      );
    },

    getLimitBuildings: owner => {
      return Object.values(get().buildings).filter(
        building =>
          building.owner === owner && building.populationSupply !== undefined,
      );
    },

    changeAttackPoints: (id: string) => {
      set(state => {
        const building = state.buildings[id];
        if (!building) return;

        if (building.attackPoints !== undefined && building.attackPoints > 0) {
          building.attackPoints--;
        }
      });
    },

    checkBaseDestroyed: () => {
      const { buildings } = get();
      const playerBase = Object.values(buildings).find(
        base => base.type === 'base' && base.owner === 'player',
      );
      const aiBase = Object.values(buildings).find(
        base => base.type === 'base' && base.owner === 'ai',
      );

      if (!playerBase) return 'ai';
      if (!aiBase) return 'player';

      return null;
    },

    selectBuildingForSpawn: buildingType => {
      set(state => {
        state.selectedBuildingForSpawn = buildingType;
      });
    },

    clearSelectedBuildingForSpawn: () => {
      set(state => {
        state.selectedBuildingForSpawn = null;
      });
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
          state.selectedBuildingForSpawn = null;
        });
      }),

    resetStore: () => {
      set(state => {
        state.buildings = {};
        state.selectedBuildingForSpawn = null;
      });
    },
  })),
);
