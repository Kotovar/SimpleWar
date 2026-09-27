import type { Position } from '@shared/config';
import type { AiContext } from './context';
import { cellKey, manhattan, sides } from './geometry';

/** Окрестность цели, в которой проверяется доступ к клеткам атаки. */
const RADIUS = 8;

/**
 * Клетки у цели, куда можно дойти снаружи окрестности. Стены — здания,
 * враги, непроходимая местность и свои юниты вплотную к цели (они уже
 * атакуют и не уйдут). Остальные свои юниты проходимы: они сами идут к цели.
 *
 * @param blocked - Клетка, которую займёт юнит (становится стеной).
 * @param freed - Клетка, которую юнит освободит.
 * @returns Ключи достижимых клеток окрестности.
 */
export const approachReach = (
  ctx: AiContext,
  target: Position,
  blocked: Position | null = null,
  freed: Position | null = null,
): Set<number> => {
  const same = (p: Position | null, x: number, y: number) =>
    !!p && p.x === x && p.y === y;
  const movable = new Set(
    ctx.obs.ownUnits
      .filter(unit => manhattan(unit, target) > 1)
      .map(({ x, y }) => cellKey(x, y, ctx.width)),
  );
  const grid = ctx.grid(2);
  const open = (x: number, y: number) => {
    if (!ctx.inside({ x, y }) || manhattan({ x, y }, target) > RADIUS) {
      return false;
    }
    if (same(blocked, x, y)) return false;
    if (same(freed, x, y)) return true;
    return grid[y][x] > 0 || movable.has(cellKey(x, y, ctx.width));
  };

  // Вход снаружи — самые дальние открытые клетки окрестности.
  let edge = -1;
  const cells: Position[] = [];
  for (let dy = -RADIUS; dy <= RADIUS; dy++) {
    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      const cell = { x: target.x + dx, y: target.y + dy };
      if (!open(cell.x, cell.y)) continue;
      const distance = manhattan(cell, target);
      if (distance > edge) {
        edge = distance;
        cells.length = 0;
      }
      if (distance === edge) cells.push(cell);
    }
  }

  const reached = new Set(cells.map(({ x, y }) => cellKey(x, y, ctx.width)));
  const queue = [...cells];
  while (queue.length) {
    const cell = queue.pop()!;
    for (const next of sides(cell)) {
      const key = cellKey(next.x, next.y, ctx.width);
      if (reached.has(key) || !open(next.x, next.y)) continue;
      reached.add(key);
      queue.push(next);
    }
  }
  return reached;
};

/** Сколько клеток из списка остаются доступными снаружи. */
export const countReachable = (
  ctx: AiContext,
  reach: Set<number>,
  cells: Position[],
) => cells.filter(({ x, y }) => reach.has(cellKey(x, y, ctx.width))).length;

/**
 * Узкое место: если встать на клетку, её проходимые соседи теряют связь
 * друг с другом в ближней окрестности. Свои юниты проходимы.
 */
export const isChoke = (ctx: AiContext, cell: Position) => {
  const units = new Set(
    ctx.obs.ownUnits.map(({ x, y }) => cellKey(x, y, ctx.width)),
  );
  const grid = ctx.grid(1);
  const open = (p: Position) =>
    ctx.inside(p) &&
    manhattan(p, cell) <= 3 &&
    !(p.x === cell.x && p.y === cell.y) &&
    (grid[p.y][p.x] > 0 || units.has(cellKey(p.x, p.y, ctx.width)));
  const neighbours = sides(cell).filter(open);
  if (neighbours.length <= 1) return false;
  const reached = new Set([
    cellKey(neighbours[0].x, neighbours[0].y, ctx.width),
  ]);
  const queue = [neighbours[0]];
  while (queue.length) {
    const current = queue.pop()!;
    for (const next of sides(current)) {
      const key = cellKey(next.x, next.y, ctx.width);
      if (reached.has(key) || !open(next)) continue;
      reached.add(key);
      queue.push(next);
    }
  }
  return neighbours.some(n => !reached.has(cellKey(n.x, n.y, ctx.width)));
};
