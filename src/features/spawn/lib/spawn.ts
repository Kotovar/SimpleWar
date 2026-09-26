import {
  UNITS_CONFIG,
  type CommandResult,
  type ParticipantId,
  type UnitType,
} from '@shared/config';
import {
  canSpawnUnit,
  failure,
  isBuildableTerrain,
  ok,
  reject,
} from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { getDebugExceptions, getPayableResources } from '@entities/settings';

/** Приказ найма: кто, в каком здании, кого и на какую клетку. */
export type SpawnCommand = {
  actor: ParticipantId;
  buildingId: string;
  unitType: UnitType;
  x: number;
  y: number;
};

const SPAWN_REJECTION = {
  resources: 'resources',
  population: 'population',
  spawnPoints: 'points',
} as const;

const validateAndSpawn = (
  { actor, buildingId, unitType, x, y }: SpawnCommand,
  isFree: boolean,
): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const { buildings, changeSpawnPoints, getBuildingAt } =
    useBuildingsStore.getState();
  const building = buildings[buildingId];
  if (!building) return reject('notFound');
  if (building.owner !== actor) return reject('owner');
  if (
    building.role !== 'production' ||
    !building.spawningUnits.includes(unitType)
  )
    return reject('actionType');

  const cell = useMapStore.getState().getCell(x, y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !cell) {
    return reject('bounds');
  }
  if (!isBuildableTerrain('grass', cell.type)) return reject('terrain');
  if (Math.max(Math.abs(building.x - x), Math.abs(building.y - y)) !== 1) {
    return reject('distance');
  }
  const { spawnUnit, getUnitAt } = useUnitsStore.getState();
  if (getUnitAt(x, y) || getBuildingAt(x, y)) return reject('occupied');

  const { resources, populationCap, removeResources } =
    useEconomyStore.getState();
  // Бесплатность снимает только цену: население и очки найма проверены как обычно.
  const check = canSpawnUnit(
    unitType,
    getPayableResources(resources[actor], isFree),
    populationCap[actor],
    building.spawnPoints,
  );
  if (!check.canSpawn) {
    return reject(
      SPAWN_REJECTION[check.reason as keyof typeof SPAWN_REJECTION],
    );
  }

  if (!spawnUnit(unitType, x, y, actor)) {
    return failure(`Юнит ${unitType} не создан`);
  }
  changeSpawnPoints(buildingId);
  if (!isFree) removeResources(actor, UNITS_CONFIG[unitType].cost);
  return ok;
};

/**
 * Нанимает юнита рядом со зданием и списывает ресурсы действующей стороны.
 * Стартовые объекты создаются напрямую через хранилище, а не этой командой.
 * Бесплатный найм отладки снимает только цену и пишется в журнал.
 *
 * @param command - Участник, здание, тип юнита и клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const spawn = (command: SpawnCommand) => {
  const isFree = getDebugExceptions(command.actor).includes('freeSpawn');
  return runCommand(
    {
      type: 'spawn',
      actor: command.actor,
      details: {
        buildingId: command.buildingId,
        unitType: command.unitType,
        x: command.x,
        y: command.y,
        ...(isFree ? { debug: 'freeSpawn' } : {}),
      },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndSpawn(command, isFree),
  );
};
