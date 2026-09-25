import PF from 'pathfinding';
import { isCellOccupied } from './isCellOccupied';
import type { Cell } from '@shared/config';

/**
 * Создаёт сетку поиска пути с препятствиями из рельефа и занятых клеток.
 *
 * @param grid - Клетки карты.
 * @returns Новая сетка для поиска пути.
 */
export const createMovementPFGrid = (grid: Cell[][]) => {
  return new PF.Grid(
    grid.map(row =>
      row.map(cell => {
        const blocked = !cell.isWalkable || isCellOccupied(cell.x, cell.y);

        return blocked ? 1 : 0;
      }),
    ),
  );
};
