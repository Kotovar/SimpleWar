import type { Position } from '@shared/config';
import type { MovementGrid } from '@shared/lib';

/**
 * Оценивает, на каком ходу юнит дойдёт до конца маршрута. Клетки, где
 * остановиться нельзя (свои юниты), — транзит: их цена списывается вместе
 * со следующей свободной клеткой одним отрезком. Отрезок, на который не
 * хватает остатка очков, переносится на следующий ход с полными очками.
 *
 * @param path - Клетки маршрута от текущей позиции до цели.
 * @param costs - Цены входа, по которым построен маршрут.
 * @param movePoints - Очки движения, оставшиеся в этот ход.
 * @param maxMovePoints - Очки движения в начале каждого следующего хода.
 * @param canLand - Можно ли остановиться на клетке; по умолчанию — везде.
 * @returns `1` — дойдёт в этот ход, `2` — в следующий и т. д.; `Infinity`,
 * если клетка непроходима или отрезок дороже полного запаса очков.
 */
export const countRouteTurns = (
  path: Position[],
  costs: MovementGrid,
  movePoints: number,
  maxMovePoints: number,
  canLand: (cell: Position) => boolean = () => true,
) => {
  let turns = 1;
  let left = movePoints;
  let pending = 0;
  for (const cell of path.slice(1)) {
    const cost = costs[cell.y]?.[cell.x] ?? 0;
    if (!cost) return Infinity;
    pending += cost;
    if (!canLand(cell)) continue;
    if (pending > maxMovePoints) return Infinity;
    if (pending > left) {
      turns++;
      left = maxMovePoints;
    }
    left -= pending;
    pending = 0;
  }
  return pending ? Infinity : turns;
};
