import type { CommandResult, ParticipantId, Position } from '@shared/config';
import { isAdjacent, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import {
  getOwnWorker,
  isRejection,
  isVisibleTo,
  runWorkerCommand,
} from './common';

/** Приказ расчистки: кто, каким рабочим и какую клетку леса. */
export type ClearForestCommand = {
  actor: ParticipantId;
  workerId: string;
  x: number;
  y: number;
};

/**
 * Клетки леса, которые рабочий может расчистить сейчас: соседние,
 * видимые участнику и без объекта. Та же проверка, что в команде.
 *
 * @param actor - Участник.
 * @param worker - Позиция рабочего.
 */
export const getClearableCells = (
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
      if (getCell(x, y)?.type !== 'forest') continue;
      if (getUnitAt(x, y) || getBuildingAt(x, y)) continue;
      if (isVisibleTo(actor, x, y)) cells.push({ x, y });
    }
  }
  return cells;
};

const validateAndClear = ({
  actor,
  workerId,
  x,
  y,
}: ClearForestCommand): CommandResult => {
  const worker = getOwnWorker(actor, workerId);
  if (isRejection(worker)) return worker;

  const { getCell, setCell } = useMapStore.getState();
  const cell = Number.isInteger(x) && Number.isInteger(y) && getCell(x, y);
  if (!cell) return reject('bounds');
  // Скрытая клетка отклоняется до проверки местности: рельеф не раскрывается.
  if (!isVisibleTo(actor, x, y)) return reject('hidden');
  if (!isAdjacent(worker, { x, y })) return reject('distance');
  if (cell.type !== 'forest') return reject('terrain');
  if (
    useUnitsStore.getState().getUnitAt(x, y) ||
    useBuildingsStore.getState().getBuildingAt(x, y)
  ) {
    return reject('occupied');
  }
  if (worker.buildPoints <= 0) return reject('points');

  // Дерево не выдаётся: расчистка — не добыча. Обзор и маршруты
  // обновятся по подписке на карту.
  setCell(x, y, { type: 'grass', isWalkable: true });
  useUnitsStore.getState().changeBuildPoints(workerId);
  return ok;
};

/**
 * Расчищает соседнюю видимую клетку леса: она сразу становится полем,
 * тратится очко стройки, движение рабочего заканчивается.
 *
 * @param command - Участник, рабочий и клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const clearForest = (command: ClearForestCommand) =>
  runWorkerCommand(
    {
      type: 'clearForest',
      actor: command.actor,
      details: { workerId: command.workerId, x: command.x, y: command.y },
    },
    () => validateAndClear(command),
  );
