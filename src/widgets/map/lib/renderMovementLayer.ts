import { CELL_SIZE, Position } from '@shared/config';

import { drawMovement } from './drawMovement';

export const renderMovementLayer = (
  ctx: CanvasRenderingContext2D,
  reachableCells: Position[] | null,
  attackableEnemies: Position[] | null,
) => {
  if (reachableCells) {
    reachableCells.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, CELL_SIZE, 'free');
    });
  }

  if (attackableEnemies) {
    attackableEnemies.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, CELL_SIZE, 'enemy');
    });
  }
};
