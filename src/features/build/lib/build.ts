import { BUILDINGS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { canSpawnBuilding } from '@shared/lib';

export const build = (
  selectedUnitId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { spawnBuilding, selectedBuildingForSpawn } =
    useBuildingsStore.getState();

  const { removeResources, resources } = useEconomyStore.getState();

  const { changeBuildPoints, units } = useUnitsStore.getState();

  if (!selectedBuildingForSpawn) return;

  const config = BUILDINGS_CONFIG[selectedBuildingForSpawn];

  const buildCosts = config.cost;

  const worker = units[selectedUnitId];
  if (!worker || !('buildPoints' in worker)) return;

  const check = canSpawnBuilding(
    selectedBuildingForSpawn,
    resources[owner],
    worker.buildPoints,
  );

  if (!check.canSpawn) {
    console.warn(check.message);
    return;
  }

  spawnBuilding(selectedBuildingForSpawn, x, y, owner);
  changeBuildPoints(selectedUnitId);
  removeResources('player', buildCosts);
};
