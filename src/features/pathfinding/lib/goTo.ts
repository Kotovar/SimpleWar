import {
  REJECTION_MESSAGE,
  type CommandResult,
  type ParticipantId,
  type Unit,
  type UnitOrder,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { createLandingCheck } from './air';
import { getRoutePreview } from './routePreview';
import { advanceExploration } from './autoExplore';
import { getSeenEnemies, move } from './move';

/** Приказ «Идти в точку»: кто, каким юнитом и куда. */
export type GoToCommand = {
  actor: ParticipantId;
  unitId: string;
  x: number;
  y: number;
};

export { getRoutePreview } from './routePreview';

/** Маршрут приказа: к цели движения или к свободной клетке рядом со стройкой/работой. */
export const getOrderRoutePreview = (
  unit: Unit,
  actor: ParticipantId,
  order: UnitOrder,
) => {
  if (order.type === 'goto' || order.type === 'explore')
    return getRoutePreview(unit, actor, order);
  if (Math.max(Math.abs(unit.x - order.x), Math.abs(unit.y - order.y)) === 1)
    return null;
  const routes = [];
  for (let y = order.y - 1; y <= order.y + 1; y++) {
    for (let x = order.x - 1; x <= order.x + 1; x++) {
      if (x === order.x && y === order.y) continue;
      if (!useMapStore.getState().getCell(x, y)) continue;
      const route = getRoutePreview(unit, actor, { x, y });
      if (route) routes.push(route);
    }
  }
  return routes.sort((a, b) => a.cost - b.cost)[0] ?? null;
};

/** Действие по прибытии выполняет вызывающий слой обычной командой. */
export type OrderArrival = (
  unit: Unit & { order: Extract<UnitOrder, { type: 'build' | 'work' }> },
) => CommandResult;

/** Причина остановки приказа для игрока. */
export const getOrderStopMessage = (
  reason: NonNullable<UnitOrder['stopped']>,
) =>
  reason === 'enemy'
    ? 'В обзоре враг'
    : reason === 'explored'
      ? 'Нет достижимых неизведанных клеток'
      : reason === 'threat'
        ? 'На пути известная угроза'
        : REJECTION_MESSAGE[reason];

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
export const advanceOrder = (
  actor: ParticipantId,
  unitId: string,
  onArrival?: OrderArrival,
) => {
  const { units, setOrder } = useUnitsStore.getState();
  const unit = units[unitId];
  const order = unit?.order;
  if (!order || order.stopped || unit.owner !== actor) return false;
  if (getTurnRejection(actor)) return false;
  if (order.type === 'explore') return advanceExploration(actor, unitId);
  const stop = (stopped: NonNullable<UnitOrder['stopped']>) => {
    const result = runCommand(
      { type: 'order', actor, details: { unitId, stopped } },
      useGameLoopStore.getState().currentTurn,
      () => {
        setOrder(unitId, { ...order, stopped });
        return ok;
      },
    );
    return result.ok;
  };

  if (order.type !== 'goto' && !onArrival) return false;
  const arrive = (worker: Unit) => {
    if (order.type === 'goto' || !onArrival) return false;
    // Отсутствие рабочего действия означает ожидание следующего своего хода.
    if (
      order.type === 'build' &&
      worker.role === 'civil' &&
      worker.buildPoints <= 0
    )
      return false;
    const result = onArrival({ ...worker, order });
    return !result.ok && result.code !== 'busy' ? stop(result.code) : false;
  };
  if (
    order.type !== 'goto' &&
    Math.max(Math.abs(unit.x - order.x), Math.abs(unit.y - order.y)) === 1
  )
    return arrive(unit);
  const plan = getOrderRoutePreview(unit, actor, order);
  if (!plan)
    return stop(
      order.type !== 'goto' || createLandingCheck(actor)(order)
        ? 'path'
        : 'occupied',
    );
  if (plan.firstStop > unit.movePoints) return false;

  const seen = getSeenEnemies(actor);
  const target = plan.path[plan.path.length - 1];
  const result = move({ actor, unitId, ...target, partial: true });
  if (!result.ok) return result.code === 'busy' ? false : stop(result.code);
  const moved = useUnitsStore.getState().units[unitId];
  if (!moved) return false;
  if (order.type === 'goto' && moved.x === order.x && moved.y === order.y) {
    setOrder(unitId, null);
    return false;
  }
  if ([...getSeenEnemies(actor)].some(id => !seen.has(id)))
    return stop('enemy');
  if (
    order.type !== 'goto' &&
    Math.max(Math.abs(moved.x - order.x), Math.abs(moved.y - order.y)) === 1
  )
    return arrive(moved);
  if (!getOrderRoutePreview(moved, actor, order)) {
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
export const executeOrders = (actor: ParticipantId, onArrival?: OrderArrival) =>
  Object.values(useUnitsStore.getState().units)
    .filter(unit => unit.owner === actor && unit.order && !unit.order.stopped)
    .map(unit => unit.id)
    .sort()
    .filter(id => advanceOrder(actor, id, onArrival));
