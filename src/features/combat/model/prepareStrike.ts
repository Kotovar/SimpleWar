import {
  SIEGE_STRIKE,
  type CommandResult,
  type ParticipantId,
  type Position,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import {
  getKnownCellType,
  getParticipantKnowledge,
} from '@entities/perceptions';
import { runCommand } from '@entities/journals';

/** Приказ подготовить удар: чьё орудие и по какой клетке. */
export type PrepareStrikeCommand = {
  actor: ParticipantId;
  unitId: string;
  x: number;
  y: number;
};

/**
 * Клетки, по которым орудие может подготовить удар: разведанные участником
 * в дальности 2–5 по Manhattan. Юниты на клетке значения не имеют.
 *
 * @param actor - Владелец орудия.
 * @param from - Позиция орудия.
 */
export const getStrikeCells = (
  actor: ParticipantId,
  from: Position,
): Position[] => {
  const grid = useMapStore.getState().grid;
  const knowledge = getParticipantKnowledge(actor);
  const cells: Position[] = [];
  const { minRange, maxRange } = SIEGE_STRIKE;
  for (let dy = -maxRange; dy <= maxRange; dy++) {
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      const x = from.x + dx;
      const y = from.y + dy;
      if (distance < minRange || distance > maxRange || !grid[y]?.[x]) continue;
      if (getKnownCellType(knowledge, x, y)) cells.push({ x, y });
    }
  }
  return cells;
};

const validateAndPrepare = ({
  actor,
  unitId,
  x,
  y,
}: PrepareStrikeCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const unit = useUnitsStore.getState().units[unitId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');
  if (unit.role !== 'military' || unit.type !== 'siege') {
    return reject('actionType');
  }
  if (unit.attackPoints <= 0 || unit.preparedStrike) return reject('points');
  if (!useMapStore.getState().grid[y]?.[x]) return reject('bounds');
  // Целиться можно только в разведанную клетку.
  if (!getKnownCellType(getParticipantKnowledge(actor), x, y)) {
    return reject('hidden');
  }
  const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
  if (distance < SIEGE_STRIKE.minRange || distance > SIEGE_STRIKE.maxRange) {
    return reject('distance');
  }

  // Подготовка тратит боевое действие; движение до конца хода закончено.
  const units = useUnitsStore.getState();
  units.setPreparedStrike(unitId, { x, y });
  units.changeAttackPoints(unitId);
  return ok;
};

/**
 * Готовит удар осадной машины по клетке: исполнится в начале следующего
 * своего хода. Отметка клетки публична, позицию орудия она не раскрывает.
 *
 * @param command - Участник, орудие и клетка.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const prepareStrike = (command: PrepareStrikeCommand) =>
  runCommand(
    {
      type: 'prepareStrike',
      actor: command.actor,
      details: { unitId: command.unitId, x: command.x, y: command.y },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndPrepare(command),
  );
