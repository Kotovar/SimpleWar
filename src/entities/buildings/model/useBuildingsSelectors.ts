import { useBuildingsStore } from '@entities/buildings';

export const useBuildingsSelectors = () => {
  const buildings = useBuildingsStore(state => state.buildings);
  const selectedBuildingForSpawn = useBuildingsStore(
    state => state.selectedBuildingForSpawn,
  );
  const getBuildingAt = useBuildingsStore(state => state.getBuildingAt);
  const spawnBuilding = useBuildingsStore(state => state.spawnBuilding);
  const selectBuildingForSpawn = useBuildingsStore(
    state => state.selectBuildingForSpawn,
  );
  const clearSelectedBuildingForSpawn = useBuildingsStore(
    state => state.clearSelectedBuildingForSpawn,
  );
  const resetStore = useBuildingsStore(state => state.resetStore);
  const resetBuildingsForNewTurn = useBuildingsStore(
    state => state.resetBuildingsForNewTurn,
  );
  const getEconomicBuildings = useBuildingsStore(
    state => state.getEconomicBuildings,
  );

  return {
    buildings,
    selectedBuildingForSpawn,
    getBuildingAt,
    selectBuildingForSpawn,
    spawnBuilding,
    resetBuildingsForNewTurn,
    resetStore,
    getEconomicBuildings,
    clearSelectedBuildingForSpawn,
  };
};
