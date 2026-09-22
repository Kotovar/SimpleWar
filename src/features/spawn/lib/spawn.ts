import { UNITS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { canSpawnUnit } from '@shared/lib';

export const spawn = (
  selectedBuildingId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { phase, activePlayer } = useGameLoopStore.getState();

  if (phase !== 'inProgress' || activePlayer !== owner) return;

  const { selectedUnitForSpawn, spawnUnit } = useUnitsStore.getState();
  const { removeResources, resources, populationCap } =
    useEconomyStore.getState();
  const { changeSpawnPoints, buildings } = useBuildingsStore.getState();

  if (!selectedUnitForSpawn) return;

  const building = buildings[selectedBuildingId];
  if (
    !building ||
    building.owner !== owner ||
    building.role !== 'production' ||
    !building.spawningUnits.includes(selectedUnitForSpawn)
  )
    return;

  const cell = useMapStore.getState().getCell(x, y);
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !cell ||
    cell.type !== 'grass' ||
    !cell.isWalkable ||
    Math.max(Math.abs(building.x - x), Math.abs(building.y - y)) !== 1 ||
    useUnitsStore.getState().getUnitAt(x, y) ||
    useBuildingsStore.getState().getBuildingAt(x, y)
  )
    return;

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

  if (!spawnUnit(selectedUnitForSpawn, x, y, owner)) return;
  changeSpawnPoints(selectedBuildingId);
  removeResources(owner, cost);
};
