import type { ParticipantId, Position, Unit } from '@shared/config';
import type { MovementGrid } from '@shared/lib';
import { createLandingCheck, createUnitMovementGrid } from './air';
import { TURN_UNKNOWN_COST } from './createKnownMovementGrid';
import { countRouteTurns } from './countRouteTurns';
import { getPath } from './getPath';

/**
 * Самый дешёвый путь, где каждый отрезок транзита (клетки без остановки
 * плюс следующая свободная) стоит не больше `maxSegment`. Дейкстра с
 * корзинами по состоянию «клетка + накопленный транзит».
 *
 * @param landable - Маска клеток, где можно остановиться, `y * width + x`.
 * @returns Путь от начала до цели и цена; пустой путь и `Infinity` — нет.
 */
export const findSegmentedPath = (
  costs: MovementGrid,
  start: Position,
  target: Position,
  landable: ArrayLike<number>,
  maxSegment: number,
) => {
  const width = costs[0]?.length ?? 0;
  const height = costs.length;
  const inside = ({ x, y }: Position) =>
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height;
  if (
    !inside(start) ||
    !inside(target) ||
    !Number.isInteger(maxSegment) ||
    maxSegment <= 0 ||
    !landable[target.y * width + target.x]
  ) {
    return { path: [] as Position[], cost: Infinity };
  }
  const span = maxSegment + 1;
  const targetKey = target.y * width + target.x;
  const startState = (start.y * width + start.x) * span;
  const best = new Map([[startState, 0]]);
  const from = new Map<number, number>();
  const buckets: number[][] = [[startState]];

  for (let current = 0; current < buckets.length; current++) {
    for (const state of buckets[current] ?? []) {
      if (best.get(state) !== current) continue;
      const key = Math.floor(state / span);
      if (key === targetKey) {
        const path: Position[] = [];
        for (let s: number | undefined = state; s !== undefined;) {
          const cell = Math.floor(s / span);
          path.push({ x: cell % width, y: Math.floor(cell / width) });
          s = from.get(s);
        }
        return { path: path.reverse(), cost: current };
      }
      const pending = state % span;
      const x = key % width;
      const y = (key - x) / width;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const enter = costs[ny][nx];
        const segment = pending + enter;
        if (!enter || segment > maxSegment) continue;
        const cell = ny * width + nx;
        const next = current + enter;
        const nextState = cell * span + (landable[cell] ? 0 : segment);
        if ((best.get(nextState) ?? Infinity) <= next) continue;
        best.set(nextState, next);
        from.set(nextState, state);
        (buckets[next] ??= []).push(nextState);
      }
    }
  }
  return { path: [] as Position[], cost: Infinity };
};

/**
 * Маршрут юнита по известной участнику карте с ходом прибытия. Кратчайший
 * путь может идти транзитом через своих; если такой отрезок дороже полного
 * запаса очков, ищется путь с допустимыми отрезками транзита.
 *
 * @returns Путь и цена (пустой путь и `Infinity` — пути нет), ход прибытия
 * (`Infinity` — не дойти), цены клеток и проверка остановки.
 */
export const findUnitRoute = (
  unit: Unit,
  actor: ParticipantId,
  target: Position,
) => {
  const canLand = createLandingCheck(actor);
  const costs = createUnitMovementGrid(unit, actor, TURN_UNKNOWN_COST);
  const turnsOf = (path: Position[]) =>
    countRouteTurns(path, costs, unit.movePoints, unit.maxMovePoints, canLand);
  let route = getPath(unit, target, costs);
  let turns = turnsOf(route.path);
  if (route.path.length > 1 && turns === Infinity) {
    const landable = Uint8Array.from(costs.flat(), (_, index) => {
      const x = index % costs[0].length;
      const y = (index - x) / costs[0].length;
      return canLand({ x, y }) ? 1 : 0;
    });
    route = findSegmentedPath(
      costs,
      unit,
      target,
      landable,
      unit.maxMovePoints,
    );
    turns = turnsOf(route.path);
  }
  return { ...route, turns, costs, canLand };
};
