import { BUILDINGS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { canSpawnBuilding } from '@shared/lib';

/**
 * Строит выбранное здание рядом с рабочим и списывает ресурсы при успехе.
 *
 * @param selectedUnitId - ID рабочего.
 * @param x - Столбец клетки для постройки.
 * @param y - Строка клетки для постройки.
 * @param owner - Сторона, выполняющая действие.
 */
export const build = (
  selectedUnitId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { phase, activePlayer } = useGameLoopStore.getState();

  if (phase !== 'inProgress' || activePlayer !== owner) return;

  const { spawnBuilding, selectedBuildingForSpawn } =
    useBuildingsStore.getState();

  const { removeResources, resources } = useEconomyStore.getState();

  const { changeBuildPoints, units } = useUnitsStore.getState();

  if (!selectedBuildingForSpawn) return;

  const config = BUILDINGS_CONFIG[selectedBuildingForSpawn];

  const buildCosts = config.cost;

  const worker = units[selectedUnitId];
  if (
    !worker ||
    worker.owner !== owner ||
    worker.role !== 'civil' ||
    !worker.canBuild ||
    !worker.buildableBuildings.includes(selectedBuildingForSpawn)
  )
    return;

  const cell = useMapStore.getState().getCell(x, y);
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !cell ||
    cell.type !== (config.requiredField ?? 'grass') ||
    Math.max(Math.abs(worker.x - x), Math.abs(worker.y - y)) !== 1 ||
    useUnitsStore.getState().getUnitAt(x, y) ||
    useBuildingsStore.getState().getBuildingAt(x, y)
  )
    return;

  const check = canSpawnBuilding(
    selectedBuildingForSpawn,
    resources[owner],
    worker.buildPoints,
  );

  if (!check.canSpawn) {
    console.warn(check.message);
    return;
  }

  if (!spawnBuilding(selectedBuildingForSpawn, x, y, owner)) return;
  changeBuildPoints(selectedUnitId);
  removeResources(owner, buildCosts);
};
