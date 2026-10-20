import type { ParticipantId, Position, UnitOrder } from '@shared/config';
import { canHaveRoad, isAdjacent, isWorker, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useBuildingsStore } from '@entities/buildings';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { getParticipantKnowledge, isKnownRoad } from '@entities/perceptions';
import type { OrderArrival } from './goTo';
import { getRoutePreview } from './routePreview';
import { getSeenEnemies, move } from './move';

/** Приказ «Проложить дорогу до…»: кто, каким рабочим и до какой клетки. */
export type RoadOrderCommand = {
  actor: ParticipantId;
  workerId: string;
  x: number;
  y: number;
};

/**
 * Ставит рабочему приказ проложить дорогу до клетки; прежний приказ
 * заменяется. Шагов не делает: исполнение — {@link advanceRoadOrder}.
 *
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const giveRoadOrder = ({ actor, workerId, x, y }: RoadOrderCommand) =>
  runCommand(
    { type: 'order', actor, details: { unitId: workerId, x, y, road: 1 } },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turnRejection = getTurnRejection(actor);
      if (turnRejection) return reject(turnRejection);
      const unit = useUnitsStore.getState().units[workerId];
      if (!unit) return reject('notFound');
      if (unit.owner !== actor) return reject('owner');
      if (!isWorker(unit)) return reject('actionType');
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        !useMapStore.getState().getCell(x, y)
      ) {
        return reject('bounds');
      }
      if (!getRoutePreview(unit, actor, { x, y })) return reject('path');
      useUnitsStore.getState().setOrder(workerId, { type: 'road', x, y });
      return ok;
    },
  );

/**
 * Ход приказа дороги: рабочий идёт по маршруту к цели до первой клетки,
 * где дороги по его знаниям нет, и кладёт её командой `onArrival`.
 * После шага выбор повторяется: дорога, открытая по пути, продолжает
 * приказ. Начинает с клетки под собой, если дорога там возможна. Нет очка
 * стройки или клетку (в том числе цель) занял юнит — ждёт следующего хода;
 * отказ команды, новый враг или пропавший путь останавливают приказ.
 * Дорога на цели снимает приказ.
 *
 * @param stop - Остановить приказ с причиной.
 * @returns `true`, если приказ остановился сейчас.
 */
export const advanceRoadOrder = (
  actor: ParticipantId,
  unitId: string,
  onArrival: OrderArrival,
  stop: (reason: NonNullable<UnitOrder['stopped']>) => boolean,
): boolean => {
  const { units, setOrder } = useUnitsStore.getState();
  const unit = units[unitId];
  const order = unit?.order;
  if (order?.type !== 'road') return false;
  const target = { x: order.x, y: order.y };
  const knowledge = getParticipantKnowledge(actor);
  const plan =
    unit.x === target.x && unit.y === target.y
      ? null
      : getRoutePreview(unit, actor, target);
  if (!plan) {
    if (unit.x === target.x && unit.y === target.y) {
      setOrder(unitId, null);
      return false;
    }
    // Цель занял свой юнит — путь появится, когда он уйдёт.
    const occupant = useUnitsStore.getState().getUnitAt(target.x, target.y);
    return occupant?.owner === actor ? false : stop('path');
  }
  const { getCell } = useMapStore.getState();
  const index = plan.path.findIndex(
    ({ x, y }, i) =>
      !isKnownRoad(knowledge, x, y) &&
      // Под собой — только там, где дорога возможна: не в руднике, не в лесу.
      (i > 0 ||
        (canHaveRoad(getCell(x, y)!.type) &&
          !useBuildingsStore.getState().getBuildingAt(x, y))),
  );
  // Дорога уже до самой цели: остаётся дойти.
  const walkTo: Position =
    index === -1 ? target : plan.path[Math.max(0, index - 1)];

  if (walkTo.x !== unit.x || walkTo.y !== unit.y) {
    // Очков на первый шаг нет (в том числе при завершении хода) — ждать.
    if (plan.firstStop > unit.movePoints) return false;
    const seen = getSeenEnemies(actor);
    const result = move({ actor, unitId, ...walkTo, partial: true });
    if (!result.ok) {
      return result.code === 'busy' || result.code === 'occupied'
        ? false
        : stop(result.code);
    }
    if ([...getSeenEnemies(actor)].some(id => !seen.has(id)))
      return stop('enemy');
    const moved = useUnitsStore.getState().units[unitId];
    // Шаг открыл карту: выбрать клетку заново по свежим знаниям.
    if (moved && (moved.x !== unit.x || moved.y !== unit.y)) {
      return advanceRoadOrder(actor, unitId, onArrival, stop);
    }
  }
  const worker = useUnitsStore.getState().units[unitId];
  if (!worker) return false;
  if (index === -1) {
    if (worker.x === target.x && worker.y === target.y) setOrder(unitId, null);
    return false;
  }
  const cell = plan.path[index];
  const own = worker.x === cell.x && worker.y === cell.y;
  if (!own && !isAdjacent(worker, cell)) return false;
  if (worker.role !== 'civil' || worker.buildPoints <= 0) return false;
  if (!own && useUnitsStore.getState().getUnitAt(cell.x, cell.y)) return false;
  const result = onArrival({ ...worker, order }, cell);
  if (!result.ok) return result.code === 'busy' ? false : stop(result.code);
  if (cell.x === target.x && cell.y === target.y) setOrder(unitId, null);
  return false;
};
