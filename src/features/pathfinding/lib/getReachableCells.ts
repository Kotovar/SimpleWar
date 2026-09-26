import type { Position } from '@shared/config';
import { findCheapestPaths, type MovementGrid } from '@shared/lib';

/**
 * Клетки, до которых хватает очков движения.
 *
 * @param costs - Цены входа в клетки.
 * @param startX - Столбец стартовой клетки.
 * @param startY - Строка стартовой клетки.
 * @param maxCost - Доступные очки движения.
 * @returns Достижимые клетки без стартовой.
 */
export const getReachableCells = (
  costs: MovementGrid,
  startX: number,
  startY: number,
  maxCost: number,
): Position[] => {
  if (!(maxCost > 0)) return [];

  const { cost, width } = findCheapestPaths(
    costs,
    { x: startX, y: startY },
    maxCost,
  );
  return [...cost]
    .filter(([, spent]) => spent > 0)
    .map(([key]) => ({ x: key % width, y: Math.floor(key / width) }));
};
