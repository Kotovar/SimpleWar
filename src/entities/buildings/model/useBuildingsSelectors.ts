import { useBuildingsStore } from '@entities/buildings';

export const useBuildingsSelectors = () => {
  const buildings = useBuildingsStore(state => state.buildings);
  const getBuildingAt = useBuildingsStore(state => state.getBuildingAt);
  const spawnBuilding = useBuildingsStore(state => state.spawnBuilding);
  const resetBuildingsForNewTurn = useBuildingsStore(
    state => state.resetBuildingsForNewTurn,
  );
  const resetStore = useBuildingsStore(state => state.resetStore);

  return {
    buildings,
    getBuildingAt,
    spawnBuilding,
    resetBuildingsForNewTurn,
    resetStore,
  };
};
