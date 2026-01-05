import { useBuildingsStore } from '@entities/buildings';

export const useBuildingsSelectors = () => {
  const buildings = useBuildingsStore(state => state.buildings);
  const getBuildingAt = useBuildingsStore(state => state.getBuildingAt);

  return { buildings, getBuildingAt };
};
