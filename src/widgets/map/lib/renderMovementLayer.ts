import type { Position } from '@shared/config';
import { drawMovement } from './drawMovement';

export const renderMovementLayer = (
  ctx: CanvasRenderingContext2D,
  reachableCells: Position[] | null,
  attackableEnemies: Position[] | null,
  cellSize: number,
) => {
  if (reachableCells) {
    reachableCells.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, cellSize, 'free');
    });
  }

  if (attackableEnemies) {
    attackableEnemies.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, cellSize, 'enemy');
    });
  }
};
