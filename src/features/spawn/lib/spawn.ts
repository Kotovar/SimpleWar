import { UNITS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';

export const spawn = (
  selectedBuildingId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { selectedUnitForSpawn, spawnUnit } = useUnitsStore.getState();
  const { removeResources } = useEconomyStore.getState();
  const { changeSpawnPoints, buildings } = useBuildingsStore.getState();

  if (!selectedUnitForSpawn) return;

  const building = buildings[selectedBuildingId];
  if (!building) return;

  const { cost } = UNITS_CONFIG[selectedUnitForSpawn];
  if (!('spawnPoints' in building)) return;

  spawnUnit(selectedUnitForSpawn, x, y, owner);
  changeSpawnPoints(selectedBuildingId);
  removeResources('player', cost);
};
