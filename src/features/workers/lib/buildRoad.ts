import {
  type CommandResult,
  type ParticipantId,
  type Position,
} from '@shared/config';
import {
  canHaveRoad,
  getAvailableResources,
  getRoadCost,
  isAdjacent,
  ok,
  reject,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { getDebugExceptions } from '@entities/settings';
import {
  getOwnWorker,
  isRejection,
  isVisibleTo,
  runWorkerCommand,
} from './common';

/** Приказ дороги: кто, каким рабочим и на какой клетке. */
export type BuildRoadCommand = {
  actor: ParticipantId;
  workerId: string;
  x: number;
  y: number;
};

/**
 * Клетки, где рабочий может проложить дорогу сейчас: соседние, видимые
 * участнику, на поле, холме или болоте, без дороги и без объекта.
 * Ресурсы не проверяются: их нехватку покажет отказ команды.
 *
 * @param actor - Участник.
 * @param worker - Позиция рабочего.
 */
export const getRoadCells = (
  actor: ParticipantId,
  worker: Position,
): Position[] => {
  const { getCell } = useMapStore.getState();
  const { getUnitAt } = useUnitsStore.getState();
  const { getBuildingAt } = useBuildingsStore.getState();
  const cells: Position[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = worker.x + dx;
      const y = worker.y + dy;
      if (!dx && !dy) continue;
      const cell = getCell(x, y);
      if (!cell || cell.road || !canHaveRoad(cell.type)) continue;
      if (getUnitAt(x, y) || getBuildingAt(x, y)) continue;
      if (isVisibleTo(actor, x, y)) cells.push({ x, y });
    }
  }
  return cells;
};

const validateAndBuild = ({
  actor,
  workerId,
  x,
  y,
}: BuildRoadCommand): CommandResult => {
  const worker = getOwnWorker(actor, workerId);
  if (isRejection(worker)) return worker;

  const { getCell, setCell } = useMapStore.getState();
  const cell = Number.isInteger(x) && Number.isInteger(y) && getCell(x, y);
  if (!cell) return reject('bounds');
  // Скрытая клетка отклоняется до проверки местности: рельеф не раскрывается.
  if (!isVisibleTo(actor, x, y)) return reject('hidden');
  if (!isAdjacent(worker, { x, y })) return reject('distance');
  if (!canHaveRoad(cell.type)) return reject('terrain');
  if (cell.road) return reject('target');
  if (
    useUnitsStore.getState().getUnitAt(x, y) ||
    useBuildingsStore.getState().getBuildingAt(x, y)
  ) {
    return reject('occupied');
  }
  if (worker.buildPoints <= 0) return reject('points');

  const cost = getRoadCost(cell.type);
  const isFree = getDebugExceptions(actor).includes('freeBuild');
  const { resources, removeResources } = useEconomyStore.getState();
  const { gold, wood } = getAvailableResources(
    resources[actor],
    Object.values(useUnitsStore.getState().units),
    actor,
  );
  if (!isFree && (gold < cost.gold || wood < cost.wood)) {
    return reject('resources');
  }

  // Обзор и маршруты обновятся по подписке на карту.
  setCell(x, y, { road: true });
  if (!isFree) removeResources(actor, cost);
  useUnitsStore.getState().changeBuildPoints(workerId);
  return ok;
};

/**
 * Прокладывает дорогу на соседней видимой клетке поля, холма или болота:
 * дорога ничья и сразу удешевляет наземный ход, тратится очко стройки
 * и дерево, движение рабочего заканчивается.
 *
 * @param command - Участник, рабочий и клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const buildRoad = (command: BuildRoadCommand) =>
  runWorkerCommand(
    {
      type: 'buildRoad',
      actor: command.actor,
      details: { workerId: command.workerId, x: command.x, y: command.y },
    },
    () => validateAndBuild(command),
  );
