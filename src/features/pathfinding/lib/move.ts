import type { CommandResult, ParticipantId } from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { createMovementGrid } from './createMovementGrid';
import { getPath } from './getPath';
import { isCellOccupied } from './isCellOccupied';

/** Приказ движения: кто, каким юнитом и в какую клетку. */
export type MoveCommand = {
  actor: ParticipantId;
  unitId: string;
  x: number;
  y: number;
};

const validateAndMove = ({
  actor,
  unitId,
  x,
  y,
}: MoveCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const { units, moveUnit } = useUnitsStore.getState();
  const unit = units[unitId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');

  const { grid, getCell } = useMapStore.getState();
  if (!Number.isInteger(x) || !Number.isInteger(y) || !getCell(x, y)) {
    return reject('bounds');
  }
  if (isCellOccupied(x, y)) return reject('occupied');

  // Цена — сумма цен входа по самому дешёвому пути, а не Manhattan.
  const { cost } = getPath(unit, { x, y }, createMovementGrid(grid));
  if (cost === Infinity) return reject('path');
  if (cost > unit.movePoints) return reject('points');

  moveUnit(unitId, x, y, cost);
  return ok;
};

/**
 * Перемещает юнита по допустимому пути в пределах оставшихся очков движения.
 *
 * @param command - Участник, юнит и целевая клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const move = (command: MoveCommand) =>
  runCommand(
    {
      type: 'move',
      actor: command.actor,
      details: { unitId: command.unitId, x: command.x, y: command.y },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndMove(command),
  );
