import { BUILDINGS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';

export const build = (
  selectedUnitId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { spawnBuilding, selectedBuildingForSpawn } =
    useBuildingsStore.getState();

  const { removeResources } = useEconomyStore.getState();

  if (!selectedBuildingForSpawn) return;

  const buildCosts = BUILDINGS_CONFIG[selectedBuildingForSpawn].cost;

  const { changeBuildPoints, units } = useUnitsStore.getState();
  const worker = units[selectedUnitId];

  if (!worker || !('buildPoints' in worker)) return;
  spawnBuilding(selectedBuildingForSpawn, x, y, owner);
  changeBuildPoints(selectedUnitId);
  removeResources('player', buildCosts);
};
