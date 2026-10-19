import type { ParticipantId, Position, Unit } from '@shared/config';
import { findCheapestPaths, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { getParticipantKnowledge } from '@entities/perceptions';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { createLandingCheck } from './air';
import {
  createKnownMovementGrid,
  getActorVisibility,
  TURN_UNKNOWN_COST,
} from './createKnownMovementGrid';
import { getRoutePreview } from './routePreview';
import { getExplorationDanger } from './explorationDanger';
import { move } from './move';

/**
 * Ближайшая по цене достижимая неизвестная клетка на границе известных.
 * Цель — вне опасных клеток {@link getExplorationDanger}; путь не заходит
 * глубже текущей клетки разведчика, так что из зоны он может выйти.
 *
 * @returns Маршрут и `avoid` — маска клеток, запрещённых движению.
 */
export const getExplorationTarget = (unit: Unit, actor: ParticipantId) => {
  const grid = createKnownMovementGrid(actor, TURN_UNKNOWN_COST);
  const width = grid[0]?.length ?? 0;
  const height = grid.length;
  const visible = getActorVisibility(actor);
  const danger = getExplorationDanger(actor, width, height, visible);
  const here = danger[unit.y * width + unit.x];
  const avoid = danger.map(depth => (depth > here ? 1 : 0));
  const costs = grid.map((row, y) =>
    row.map((cost, x) => (avoid[y * width + x] ? 0 : cost)),
  );
  const terrain = getParticipantKnowledge(actor)?.terrain;
  const known = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    !!(visible[y * width + x] || terrain?.[y * width + x]);
  const canLand = createLandingCheck(actor);
  const reachable = findCheapestPaths(costs, unit).cost;
  const candidates = [...reachable]
    .filter(([key, cost]) => {
      const x = key % width;
      const y = Math.floor(key / width);
      return (
        cost > 0 &&
        !danger[key] &&
        !known(x, y) &&
        canLand({ x, y }) &&
        [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(([nx, ny]) => known(nx, ny))
      );
    })
    .sort(([a, ca], [b, cb]) => ca - cb || a - b);
  let best: ReturnType<typeof getRoutePreview> = null;
  for (const [key, lowerCost] of candidates) {
    if (best && lowerCost >= best.cost) break;
    const route = getRoutePreview(
      unit,
      actor,
      { x: key % width, y: Math.floor(key / width) },
      avoid,
    );
    if (route && (!best || route.cost < best.cost)) best = route;
  }
  return best && { ...best, avoid };
};

const isThreatened = (actor: ParticipantId, cells: Position[]) =>
  Object.values(getParticipantKnowledge(actor)?.strikes ?? {}).some(strike =>
    cells.some(cell => cell.x === strike.x && cell.y === strike.y),
  );

/**
 * Исполняет авторазведку шагами до исчерпания очков или отсутствия целей.
 * Враг в обзоре не останавливает: разведчик обходит его стороной.
 */
export const advanceExploration = (
  actor: ParticipantId,
  unitId: string,
): boolean => {
  if (getTurnRejection(actor)) return false;
  while (true) {
    const unit = useUnitsStore.getState().units[unitId];
    const order = unit?.order;
    if (
      !unit ||
      unit.owner !== actor ||
      order?.type !== 'explore' ||
      order.stopped
    )
      return false;
    const stop = (stopped: 'explored' | 'threat') => {
      const result = runCommand(
        { type: 'order', actor, details: { unitId, stopped } },
        useGameLoopStore.getState().currentTurn,
        () => {
          useUnitsStore.getState().setOrder(unitId, { ...order, stopped });
          return ok;
        },
      );
      return result.ok;
    };
    if (isThreatened(actor, [unit])) return stop('threat');
    const plan = getExplorationTarget(unit, actor);
    if (!plan) return stop('explored');
    if (plan.firstStop > unit.movePoints) return false;
    const canLand = createLandingCheck(actor);
    const end = plan.path.findIndex(
      (cell, index) => index > 0 && canLand(cell),
    );
    const segment = plan.path.slice(1, end + 1);
    if (isThreatened(actor, segment)) return stop('threat');
    const result = move({
      actor,
      unitId,
      ...plan.path[end],
      partial: true,
      avoid: plan.avoid,
    });
    if (!result.ok) {
      if (result.code === 'busy') return false;
      useUnitsStore
        .getState()
        .setOrder(unitId, { ...order, stopped: result.code });
      return true;
    }
    const target = plan.path[plan.path.length - 1];
    useUnitsStore.getState().setOrder(unitId, { type: 'explore', ...target });
  }
};

/** Включает сериализуемую авторазведку своего разведчика и сразу делает доступные шаги. */
export const autoExplore = ({
  actor,
  unitId,
}: {
  actor: ParticipantId;
  unitId: string;
}) => {
  const result = runCommand(
    { type: 'order', actor, details: { unitId, explore: 1 } },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turn = getTurnRejection(actor);
      if (turn) return reject(turn);
      const unit = useUnitsStore.getState().units[unitId];
      if (!unit) return reject('notFound');
      if (unit.owner !== actor) return reject('owner');
      if (unit.type !== 'scout') return reject('actionType');
      useUnitsStore
        .getState()
        .setOrder(unitId, { type: 'explore', x: unit.x, y: unit.y });
      return ok;
    },
  );
  if (result.ok) advanceExploration(actor, unitId);
  return result;
};
