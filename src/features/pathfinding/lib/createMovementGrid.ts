import type { Cell } from '@shared/config';
import { getMoveCost, type MovementGrid } from '@shared/lib';
import { isCellOccupied } from './isCellOccupied';

/**
 * Создаёт сетку цен входа с препятствиями из рельефа и занятых клеток.
 *
 * @param grid - Клетки карты.
 * @returns Цены входа; `0` — непроходимая или занятая клетка.
 */
export const createMovementGrid = (grid: Cell[][]): MovementGrid =>
  grid.map(row =>
    row.map(cell => (isCellOccupied(cell.x, cell.y) ? 0 : getMoveCost(cell))),
  );
