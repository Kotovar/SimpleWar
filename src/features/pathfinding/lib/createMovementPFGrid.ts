import PF from 'pathfinding';
import { isCellOccupied } from './isCellOccupied';
import type { Cell } from '@shared/config';

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
