import type { Position } from '@shared/config';
import type { AiContext } from './context';
import { cellKey, manhattan, sides } from './geometry';

/**
 * Клетки своих юнитов, которые могут уйти: юнит внутри здания клетку не
 * освобождает — её занимает здание.
 *
 * @param keep - Дополнительный отбор юнитов.
 */
export const mobileCells = (
  ctx: AiContext,
  keep: (unit: AiContext['obs']['ownUnits'][number]) => boolean = () => true,
) => {
  const buildings = new Set(
    ctx.obs.ownBuildings.map(({ x, y }) => cellKey(x, y, ctx.width)),
  );
  return new Set(
    ctx.obs.ownUnits
      .filter(keep)
      .map(({ x, y }) => cellKey(x, y, ctx.width))
      .filter(key => !buildings.has(key)),
  );
};

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
  const movable = mobileCells(ctx, unit => manhattan(unit, target) > 1);
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
