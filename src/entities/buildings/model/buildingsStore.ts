import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gameEvents } from '@shared/lib';
import type {
  Owner,
  BuildingType,
  Building,
  Player,
  ResourceBuilding,
  ProductionBuilding,
  SupplyBuilding,
} from '@shared/config';
import { createBuilding } from './createBuilding';

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
  getEconomicBuildings: (owner: Player) => ResourceBuilding[];
  getLimitBuildings: (owner: Player) => (ProductionBuilding | SupplyBuilding)[];
  getProductionBuildings: (owner: Player) => ProductionBuilding[];
  changeAttackPoints: (id: string) => void;
  changeSpawnPoints: (id: string) => void;
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
      const building = createBuilding(type, x, y, owner);
      if (!building) return null;

      set(state => {
        state.buildings[building.id] = building;
      });

      gameEvents.emit({ type: 'BUILDING_SPAWNED', building, owner });

      return building.id;
    },

    damageBuilding: (id: string, damage: number) => {
      const buildingBefore = get().buildings[id];
      if (!buildingBefore) return;

      let destroyed = false;

      set(state => {
        const building = state.buildings[id];
        if (!building) return;

        const resultHP = building.hp - damage;

        if (resultHP > 0) {
          building.hp = resultHP;
        } else {
          destroyed = true;
          delete state.buildings[id];
        }
      });

      if (destroyed) {
        gameEvents.emit({
          type: 'BUILDING_DESTROYED',
          building: buildingBefore,
          owner: buildingBefore.owner,
        });
      }
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
        (building): building is ResourceBuilding =>
          building.owner === owner && building.role === 'resource',
      );
    },

    getLimitBuildings: owner => {
      return Object.values(get().buildings).filter(
        (building): building is ProductionBuilding | SupplyBuilding =>
          building.owner === owner &&
          'populationSupply' in building &&
          building.populationSupply !== undefined,
      );
    },

    getProductionBuildings: owner => {
      return Object.values(get().buildings).filter(
        (building): building is ProductionBuilding =>
          building.owner === owner && building.role === 'production',
      );
    },

    changeAttackPoints: id => {
      set(state => {
        const building = state.buildings[id];
        if (!building || !('attackPoints' in building)) return;

        if (building.attackPoints > 0) {
          building.attackPoints--;
        }
      });
    },

    changeSpawnPoints: id => {
      set(state => {
        const building = state.buildings[id];
        if (building.role !== 'production') return;

        if (building.spawnPoints > 0) {
          building.spawnPoints--;
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
          if ('maxAttackPoints' in building && building.maxAttackPoints > 0) {
            building.attackPoints = building.maxAttackPoints;
          }

          if (building.role === 'production' && building.maxSpawnPoints > 0) {
            building.spawnPoints = building.maxSpawnPoints;
          }
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
