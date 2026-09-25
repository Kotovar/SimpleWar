import { create } from 'zustand';
import { gameEvents, withDevtools } from '@shared/lib';
import type {
  Owner,
  BuildingType,
  Building,
  ParticipantId,
  ProductionBuilding,
  SupplyBuilding,
} from '@shared/config';
import { createBuilding } from './createBuilding';

type BuildingsState = {
  buildings: Record<string, Building>;
  selectedBuildingForSpawn: BuildingType | null;

  spawnBuilding: (
    type: BuildingType,
    x: number,
    y: number,
    owner: Owner,
  ) => string | null;
  damageBuilding: (id: string, damage: number) => void;
  getBuildingAt: (x: number, y: number) => Building | null;
  getEconomicBuildings: (owner: ParticipantId) => Building[];
  getLimitBuildings: (owner: ParticipantId) => SupplyBuilding[];
  getProductionBuildings: (owner: ParticipantId) => ProductionBuilding[];
  changeAttackPoints: (id: string) => void;
  changeSpawnPoints: (id: string) => void;
  selectBuildingForSpawn: (buildingType: BuildingType) => void;
  clearSelectedBuildingForSpawn: () => void;
  resetBuildingsForNewTurn: (owner: Owner) => void;
  /** Удаляет здания выбывшего участника без событий разрушения. */
  removeOwnerBuildings: (owner: Owner) => void;
  resetStore: () => void;
};

export const useBuildingsStore = create<BuildingsState>()(
  withDevtools('buildings', (set, get) => ({
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

    damageBuilding: (id, damage) => {
      const building = get().buildings[id];
      if (!building) return;

      const hp = building.hp - damage;

      set(state => {
        if (hp > 0) state.buildings[id].hp = hp;
        else delete state.buildings[id];
      });

      if (hp <= 0) {
        gameEvents.emit({
          type: 'BUILDING_DESTROYED',
          building,
          owner: building.owner,
        });
      }
    },

    getBuildingAt: (x, y) => {
      return (
        Object.values(get().buildings).find(
          building => building.x === x && building.y === y,
        ) ?? null
      );
    },

    getEconomicBuildings: owner => {
      return Object.values(get().buildings).filter(
        building => building.owner === owner && building.income !== undefined,
      );
    },

    getLimitBuildings: owner => {
      return Object.values(get().buildings).filter(
        (building): building is SupplyBuilding =>
          building.owner === owner && building.role === 'supply',
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
        if (building?.role === 'combat' && building.attackPoints > 0) {
          building.attackPoints--;
        }
      });
    },

    changeSpawnPoints: id => {
      set(state => {
        const building = state.buildings[id];
        if (building?.role === 'production' && building.spawnPoints > 0) {
          building.spawnPoints--;
        }
      });
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

    resetBuildingsForNewTurn: owner =>
      set(state => {
        Object.values(state.buildings).forEach(building => {
          if (building.owner !== owner) return;

          if (building.role === 'combat') {
            building.attackPoints = building.maxAttackPoints;
          }

          if (building.role === 'production') {
            building.spawnPoints = building.maxSpawnPoints;
          }
        });
        state.selectedBuildingForSpawn = null;
      }),

    removeOwnerBuildings: owner =>
      set(state => {
        for (const building of Object.values(state.buildings)) {
          if (building.owner === owner) delete state.buildings[building.id];
        }
      }),

    resetStore: () => {
      set(state => {
        state.buildings = {};
        state.selectedBuildingForSpawn = null;
      });
    },
  })),
);
