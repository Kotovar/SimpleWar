import type { Position } from '@shared/config';
import type { MovementGrid } from '@shared/lib';

/**
 * Оценивает, на каком ходу юнит дойдёт до конца маршрута: шаг, на который
 * не хватает остатка очков, переносится на следующий ход с полными очками.
 *
 * ponytail: транзит через своих не учитывается — в реальном движении юнит
 * не останавливается на занятой клетке, и оценка может быть на ход меньше.
 *
 * @param path - Клетки маршрута от текущей позиции до цели.
 * @param costs - Цены входа, по которым построен маршрут.
 * @param movePoints - Очки движения, оставшиеся в этот ход.
 * @param maxMovePoints - Очки движения в начале каждого следующего хода.
 * @returns `1` — дойдёт в этот ход, `2` — в следующий и т. д.; `Infinity`,
 * если какой-то шаг дороже полного запаса очков.
 */
export const countRouteTurns = (
  path: Position[],
  costs: MovementGrid,
  movePoints: number,
  maxMovePoints: number,
) => {
  let turns = 1;
  let left = movePoints;
  for (const { x, y } of path.slice(1)) {
    const cost = costs[y]?.[x] ?? 0;
    if (!cost || cost > maxMovePoints) return Infinity;
    if (cost > left) {
      turns++;
      left = maxMovePoints;
    }
    left -= cost;
  }
  return turns;
};
