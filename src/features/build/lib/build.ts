import {
  BUILDINGS_CONFIG,
  type BuildingType,
  type CommandResult,
  type ParticipantId,
} from '@shared/config';
import { canSpawnBuilding, failure, ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

/** Приказ строительства: кто, каким рабочим, что и где. */
export type BuildCommand = {
  actor: ParticipantId;
  workerId: string;
  buildingType: BuildingType;
  x: number;
  y: number;
};

const validateAndBuild = ({
  actor,
  workerId,
  buildingType,
  x,
  y,
}: BuildCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const { units, changeBuildPoints, getUnitAt } = useUnitsStore.getState();
  const worker = units[workerId];
  if (!worker) return reject('notFound');
  if (worker.owner !== actor) return reject('owner');
  if (
    worker.role !== 'civil' ||
    !worker.canBuild ||
    !worker.buildableBuildings.includes(buildingType)
  )
    return reject('actionType');

  const config = BUILDINGS_CONFIG[buildingType];
  const cell = useMapStore.getState().getCell(x, y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !cell) {
    return reject('bounds');
  }
  if (cell.type !== (config.requiredField ?? 'grass')) return reject('terrain');
  // Рабочий строит на любой из восьми соседних клеток.
  if (Math.max(Math.abs(worker.x - x), Math.abs(worker.y - y)) !== 1) {
    return reject('distance');
  }
  const { spawnBuilding, getBuildingAt } = useBuildingsStore.getState();
  if (getUnitAt(x, y) || getBuildingAt(x, y)) return reject('occupied');

  const { resources, removeResources } = useEconomyStore.getState();
  const check = canSpawnBuilding(
    buildingType,
    resources[actor],
    worker.buildPoints,
  );
  if (!check.canSpawn) {
    return reject(check.reason === 'buildPoints' ? 'points' : 'resources');
  }

  if (!spawnBuilding(buildingType, x, y, actor)) {
    return failure(`Здание ${buildingType} не создано`);
  }
  changeBuildPoints(workerId);
  removeResources(actor, config.cost);
  return ok;
};

/**
 * Строит здание рядом с рабочим и списывает ресурсы действующей стороны.
 *
 * @param command - Участник, рабочий, тип здания и клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const build = (command: BuildCommand) =>
  runCommand(
    {
      type: 'build',
      actor: command.actor,
      details: {
        workerId: command.workerId,
        buildingType: command.buildingType,
        x: command.x,
        y: command.y,
      },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndBuild(command),
  );
