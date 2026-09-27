import { UNKNOWN_MOVE_COST, type Position, type Unit } from '@shared/config';
import { findCheapestPaths } from '@shared/lib';
import type { CostedCell } from '../model/types';
import { mobileCells } from './approach';
import type { AiContext } from './context';
import { cellKey, fromKey } from './geometry';

/** Оценка неизвестной клетки в приказе на ход — как в команде движения. */
const TURN_UNKNOWN = 1;

/**
 * Клетки, куда юнит дойдёт в этом ходу по известной карте.
 *
 * @returns Клетки с ценой пути; стартовая не входит.
 */
export const turnMoves = (ctx: AiContext, unit: Unit): CostedCell[] => {
  if (unit.movePoints <= 0) return [];
  const { cost, width } = findCheapestPaths(
    ctx.grid(TURN_UNKNOWN, true),
    unit,
    unit.movePoints,
  );
  const cells: CostedCell[] = [];
  cost.forEach((spent, key) => {
    const cell = fromKey(key, width);
    if (spent > 0 && !ctx.occupied(cell.x, cell.y))
      cells.push({ ...cell, cost: spent });
  });
  return cells;
};

/**
 * Маршруты юнита на несколько ходов по известной карте: неизвестное дороже
 * поля. Считаются один раз за шаг.
 */
export const pathsFrom = (
  ctx: AiContext,
  unit: Unit,
): ReturnType<typeof findCheapestPaths> => {
  const cacheKey = `paths:${unit.id}`;
  const cached = ctx.cache.get(cacheKey) as
    | ReturnType<typeof findCheapestPaths>
    | undefined;
  const paths =
    cached ?? findCheapestPaths(ctx.grid(UNKNOWN_MOVE_COST, true), unit);
  ctx.cache.set(cacheKey, paths);
  return paths;
};

/**
 * Следующая клетка маршрута к ближайшей из целей: маршрут строится по
 * известной карте с повышенной ценой неизвестного, а юнит идёт по нему
 * настолько далеко, насколько хватает очков этого хода.
 *
 * @param ctx - Контекст ИИ.
 * @param unit - Идущий юнит.
 * @param goals - Клетки, в любую из которых нужно прийти.
 * @returns Клетка хода и полная цена маршрута либо `null`, если пути нет.
 */
export const stepToward = (
  ctx: AiContext,
  unit: Unit,
  goals: Position[],
): { next: Position; total: number } | null => {
  if (unit.movePoints <= 0 || goals.length === 0) return null;
  const { cost, previous, width } = pathsFrom(ctx, unit);

  let best: number | undefined;
  for (const goal of goals) {
    if (ctx.occupied(goal.x, goal.y)) continue;
    const key = cellKey(goal.x, goal.y, width);
    const total = cost.get(key);
    if (total === undefined || total === 0) continue;
    if (best === undefined || total < cost.get(best)!) best = key;
  }
  if (best === undefined) return null;

  const path: number[] = [];
  for (let key: number | undefined = best; key !== undefined;) {
    path.push(key);
    key = previous.get(key);
  }
  path.reverse();

  // Цена хода считается как в команде: неизвестное — по цене поля.
  const turnGrid = ctx.grid(TURN_UNKNOWN, true);
  let spent = 0;
  let next: Position | null = null;
  for (const key of path.slice(1)) {
    const { x, y } = fromKey(key, width);
    spent += turnGrid[y][x];
    if (spent > unit.movePoints) break;
    if (!ctx.occupied(x, y)) next = { x, y };
  }
  return next ? { next, total: cost.get(best)! } : null;
};

/**
 * Свободные проходимые клетки рядом с целью (4 стороны или 8 соседей):
 * куда встать, чтобы строить, добывать, чинить или бить вплотную.
 *
 * @param diagonal - Считать ли диагональных соседей.
 */
export const standCells = (
  ctx: AiContext,
  target: Position,
  diagonal = true,
): Position[] => {
  const cells: Position[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || (!diagonal && dx && dy)) continue;
      const cell = { x: target.x + dx, y: target.y + dy };
      if (!ctx.inside(cell)) continue;
      if (ctx.grid(TURN_UNKNOWN)[cell.y][cell.x] > 0) cells.push(cell);
    }
  }
  return cells;
};

/**
 * Есть ли у клетки выход: достижимо ли из неё `need` клеток. Свои юниты
 * уходят и выход не закрывают; клетка, запертая зданиями, выхода не имеет.
 */
export const hasRoom = (ctx: AiContext, start: Position, need = 6) => {
  const units = mobileCells(ctx);
  const grid = ctx.grid(TURN_UNKNOWN);
  const seen = new Set([cellKey(start.x, start.y, ctx.width)]);
  const queue = [start];
  while (queue.length && seen.size < need) {
    const cell = queue.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      const key = cellKey(next.x, next.y, ctx.width);
      if (!ctx.inside(next) || seen.has(key)) continue;
      if (grid[next.y][next.x] <= 0 && !units.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen.size >= need;
};
