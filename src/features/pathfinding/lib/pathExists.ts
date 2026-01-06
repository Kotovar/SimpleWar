import type { Cell, Position } from '@shared/config';
import { getPath } from './getPatch';
import { createMovementPFGrid } from './createMovementPFGrid';

export const pathExists = (
  grid: Cell[][],
  firstPosition: Position,
  lastPosition: Position,
) => {
  const pfGrid = createMovementPFGrid(grid);

  return getPath(firstPosition, lastPosition, pfGrid).length > 0;
};
