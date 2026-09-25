import {
  UNITS_CONFIG,
  type CommandResult,
  type ParticipantId,
  type UnitType,
} from '@shared/config';
import { canSpawnUnit, failure, ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

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

const validateAndSpawn = ({
  actor,
  buildingId,
  unitType,
  x,
  y,
}: SpawnCommand): CommandResult => {
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
  if (cell.type !== 'grass' || !cell.isWalkable) return reject('terrain');
  if (Math.max(Math.abs(building.x - x), Math.abs(building.y - y)) !== 1) {
    return reject('distance');
  }
  const { spawnUnit, getUnitAt } = useUnitsStore.getState();
  if (getUnitAt(x, y) || getBuildingAt(x, y)) return reject('occupied');

  const { resources, populationCap, removeResources } =
    useEconomyStore.getState();
  const check = canSpawnUnit(
    unitType,
    resources[actor],
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
  removeResources(actor, UNITS_CONFIG[unitType].cost);
  return ok;
};

/**
 * Нанимает юнита рядом со зданием и списывает ресурсы действующей стороны.
 * Стартовые объекты создаются напрямую через хранилище, а не этой командой.
 *
 * @param command - Участник, здание, тип юнита и клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const spawn = (command: SpawnCommand) =>
  runCommand(
    {
      type: 'spawn',
      actor: command.actor,
      details: {
        buildingId: command.buildingId,
        unitType: command.unitType,
        x: command.x,
        y: command.y,
      },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndSpawn(command),
  );
