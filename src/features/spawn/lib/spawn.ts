import { UNITS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { canSpawnUnit } from '@shared/lib';

export const spawn = (
  selectedBuildingId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { selectedUnitForSpawn, spawnUnit } = useUnitsStore.getState();
  const { removeResources, resources, populationCap } =
    useEconomyStore.getState();
  const { changeSpawnPoints, buildings } = useBuildingsStore.getState();

  if (!selectedUnitForSpawn) return;

  const building = buildings[selectedBuildingId];
  if (!building || !('spawnPoints' in building)) return;

  const check = canSpawnUnit(
    selectedUnitForSpawn,
    resources[owner],
    populationCap[owner],
    building.spawnPoints,
  );

  if (!check.canSpawn) {
    console.warn(check.message);
    return;
  }

  const { cost } = UNITS_CONFIG[selectedUnitForSpawn];

  spawnUnit(selectedUnitForSpawn, x, y, owner);
  changeSpawnPoints(selectedBuildingId);
  removeResources('player', cost);
};
