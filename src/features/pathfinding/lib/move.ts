import type { CommandResult, ParticipantId } from '@shared/config';
import { getMoveCost, isFlyingType, isHostile, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { createLandingCheck, createUnitMovementGrid } from './air';
import {
  TURN_UNKNOWN_COST,
  getActorVisibility,
  isVisibleTo,
} from './createKnownMovementGrid';
import { getPath } from './getPath';
import { blocksGroundTransit, isCellOccupied } from './isCellOccupied';

/** Приказ движения: кто, каким юнитом и в какую клетку. */
export type MoveCommand = {
  actor: ParticipantId;
  unitId: string;
  x: number;
  y: number;
};

/** ID видимых участнику вражеских объектов. */
const getSeenEnemies = (actor: ParticipantId) => {
  const visible = getActorVisibility(actor);
  const width = useMapStore.getState().grid[0]?.length ?? 0;
  const seen = new Set<string>();
  for (const entity of [
    ...Object.values(useUnitsStore.getState().units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ]) {
    if (
      isHostile(actor, entity.owner) &&
      visible[entity.y * width + entity.x]
    ) {
      seen.add(entity.id);
    }
  }
  return seen;
};

const validateAndMove = ({
  actor,
  unitId,
  x,
  y,
}: MoveCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const { units } = useUnitsStore.getState();
  const unit = units[unitId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');

  const { getCell } = useMapStore.getState();
  if (!Number.isInteger(x) || !Number.isInteger(y) || !getCell(x, y)) {
    return reject('bounds');
  }
  // Занятость скрытой клетки не раскрывается: движение остановится перед ней.
  if (isVisibleTo(actor, x, y) && isCellOccupied(x, y)) {
    return reject('occupied');
  }

  const flying = isFlyingType(unit.type);
  // Маршрут строится по известной карте; цена — сумма цен входа.
  // Летающему нужна клетка, где по известным сведениям можно сесть.
  if (flying && !createLandingCheck(actor)({ x, y })) return reject('occupied');
  const route = getPath(
    unit,
    { x, y },
    createUnitMovementGrid(unit, actor, TURN_UNKNOWN_COST),
  );
  if (route.cost === Infinity) return reject('path');
  if (route.cost > unit.movePoints) return reject('points');
  return moveAlong(actor, unitId, route.path, flying);
};

/**
 * Проходит маршрут, фиксируя позицию только на свободных клетках.
 * Наземный проходит сквозь своих по цене рельефа, летающий — над любыми
 * объектами по цене 1. Цена транзитных клеток списывается вместе с шагом
 * на свободную; при преграде или нехватке очков остаёмся на последней
 * свободной клетке. Новый враг останавливает движение после такого шага.
 */
const moveAlong = (
  actor: ParticipantId,
  unitId: string,
  path: { x: number; y: number }[],
  flying: boolean,
): CommandResult => {
  const { moveUnit } = useUnitsStore.getState();
  const { getCell } = useMapStore.getState();
  let pending = 0;
  let steps = 0;
  let seen = getSeenEnemies(actor);
  for (const step of path.slice(1)) {
    const cell = getCell(step.x, step.y);
    const cost = cell ? (flying ? 1 : getMoveCost(cell)) : 0;
    const current = useUnitsStore.getState().units[unitId];
    if (!cost || !current || pending + cost > current.movePoints) break;
    if (!flying && blocksGroundTransit(step.x, step.y, actor)) break;
    pending += cost;
    if (isCellOccupied(step.x, step.y)) continue;

    moveUnit(unitId, step.x, step.y, pending);
    pending = 0;
    steps++;
    const now = getSeenEnemies(actor);
    const spotted = [...now].some(id => !seen.has(id));
    seen = now;
    if (spotted) break;
  }
  return steps > 0 ? ok : reject('path');
};

/**
 * Перемещает юнита по маршруту, построенному по известной участнику карте.
 * Движение пошаговое и может остановиться раньше цели.
 *
 * @param command - Участник, юнит и целевая клетка.
 * @returns Успех, если пройдена хотя бы одна клетка, либо причина отказа;
 * при отказе состояние не меняется.
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
