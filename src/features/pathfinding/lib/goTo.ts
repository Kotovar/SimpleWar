import {
  REJECTION_MESSAGE,
  type ParticipantId,
  type Position,
  type Unit,
  type UnitOrder,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { createLandingCheck } from './air';
import { findUnitRoute } from './findUnitRoute';
import { getSeenEnemies, move } from './move';

/** Приказ «Идти в точку»: кто, каким юнитом и куда. */
export type GoToCommand = {
  actor: ParticipantId;
  unitId: string;
  x: number;
  y: number;
};

/**
 * Маршрут юнита до клетки по известной участнику карте — те же цены, что
 * у приказа на ход, — и ход прибытия (`1` — этот).
 *
 * @returns Путь, цена, ходы и `firstStop` — цена до первой свободной
 * клетки (шаги через своих — транзит) — либо `null`: на клетке нельзя
 * остановиться, пути нет или нет пути без отрезка транзита дороже полного
 * запаса очков.
 */
export const getRoutePreview = (
  unit: Unit,
  actor: ParticipantId,
  target: Position,
) => {
  const { path, cost, turns, costs, canLand } = findUnitRoute(
    unit,
    actor,
    target,
  );
  if (!canLand(target) || path.length < 2 || turns === Infinity) return null;
  let firstStop = 0;
  for (const cell of path.slice(1)) {
    firstStop += costs[cell.y][cell.x];
    if (canLand(cell)) break;
  }
  return { path, cost, turns, firstStop };
};

/** Причина остановки приказа для игрока. */
export const getOrderStopMessage = (
  reason: NonNullable<UnitOrder['stopped']>,
) => (reason === 'enemy' ? 'В обзоре враг' : REJECTION_MESSAGE[reason]);

const findOwnUnit = (actor: ParticipantId, unitId: string) => {
  const unit = useUnitsStore.getState().units[unitId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');
  return unit;
};

/**
 * Ставит приказ «Идти в точку»; прежний приказ заменяется. Шагов не делает:
 * исполнение — {@link advanceOrder}.
 *
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const giveGoToOrder = ({ actor, unitId, x, y }: GoToCommand) =>
  runCommand(
    { type: 'order', actor, details: { unitId, x, y } },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turnRejection = getTurnRejection(actor);
      if (turnRejection) return reject(turnRejection);
      const unit = findOwnUnit(actor, unitId);
      if ('ok' in unit) return unit;
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        !useMapStore.getState().getCell(x, y)
      ) {
        return reject('bounds');
      }
      if (!createLandingCheck(actor)({ x, y })) return reject('occupied');
      if (!getRoutePreview(unit, actor, { x, y })) return reject('path');
      useUnitsStore.getState().setOrder(unitId, { type: 'goto', x, y });
      return ok;
    },
  );

/** Снимает приказ «Идти в точку»; юнит остаётся на месте. */
export const cancelOrder = ({
  actor,
  unitId,
}: {
  actor: ParticipantId;
  unitId: string;
}) =>
  runCommand(
    { type: 'order', actor, details: { unitId, cancel: 1 } },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turnRejection = getTurnRejection(actor);
      if (turnRejection) return reject(turnRejection);
      const unit = findOwnUnit(actor, unitId);
      if ('ok' in unit) return unit;
      if (!unit.order) return reject('target');
      useUnitsStore.getState().setOrder(unitId, null);
      return ok;
    },
  );

/**
 * Исполняет активный приказ юнита на оставшиеся очки общей командой
 * движения. Прибытие снимает приказ. Если в этот ход не дойти даже до
 * первой свободной клетки маршрута, юнит ждёт без остановки приказа.
 * Отказ движения, новый враг в обзоре или пропавший путь (в том числе
 * транзит через своих дороже полного запаса очков) останавливают приказ
 * с причиной; остановленный больше не исполняется. Вне своего хода и при
 * занятости команд приказ не трогается.
 *
 * @returns `true`, если приказ остановился сейчас и ждёт решения игрока.
 */
export const advanceOrder = (actor: ParticipantId, unitId: string) => {
  const { units, setOrder } = useUnitsStore.getState();
  const unit = units[unitId];
  const order = unit?.order;
  if (!order || order.stopped || unit.owner !== actor) return false;
  if (getTurnRejection(actor)) return false;
  const stop = (stopped: NonNullable<UnitOrder['stopped']>) => {
    setOrder(unitId, { ...order, stopped });
    return true;
  };

  const plan = getRoutePreview(unit, actor, order);
  if (!plan)
    return stop(createLandingCheck(actor)(order) ? 'path' : 'occupied');
  if (plan.firstStop > unit.movePoints) return false;

  const seen = getSeenEnemies(actor);
  const result = move({ actor, unitId, x: order.x, y: order.y, partial: true });
  if (!result.ok) return result.code === 'busy' ? false : stop(result.code);
  const moved = useUnitsStore.getState().units[unitId];
  if (!moved) return false;
  if (moved.x === order.x && moved.y === order.y) {
    setOrder(unitId, null);
    return false;
  }
  if ([...getSeenEnemies(actor)].some(id => !seen.has(id)))
    return stop('enemy');
  if (!getRoutePreview(moved, actor, order)) {
    return stop(createLandingCheck(actor)(order) ? 'path' : 'occupied');
  }
  return false;
};

/**
 * Даёт и сразу исполняет приказ «Идти в точку» на оставшиеся очки.
 *
 * @returns Итог постановки приказа; остановка видна в самом приказе.
 */
export const goTo = (command: GoToCommand) => {
  const result = giveGoToOrder(command);
  if (result.ok) advanceOrder(command.actor, command.unitId);
  return result;
};

/**
 * Исполняет активные приказы участника на оставшиеся очки: по кнопке
 * «Выполнить приказы» и при завершении хода. Повторный вызов не даёт
 * бесплатных шагов — очки уже потрачены.
 *
 * @returns ID юнитов, чьи приказы остановились в этом вызове.
 */
export const executeOrders = (actor: ParticipantId) =>
  Object.values(useUnitsStore.getState().units)
    .filter(unit => unit.owner === actor && unit.order && !unit.order.stopped)
    .map(unit => unit.id)
    .sort()
    .filter(id => advanceOrder(actor, id));
