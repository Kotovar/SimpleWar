import { SELECTED, type Position } from '@shared/config';
import { drawMovement, drawZoneOutline } from './drawMovement';

export const renderMovementLayer = (
  ctx: CanvasRenderingContext2D,
  reachableCells: Position[] | null,
  attackableEnemies: Position[] | null,
  buildableCells: Position[] | null,
  spawnableCells: Position[] | null,
  cellSize: number,
  /** Фаза пульсации целей атаки от 0 до 1. */
  pulse = 0,
) => {
  if (reachableCells) {
    reachableCells.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, cellSize, 'free');
    });
    drawZoneOutline(ctx, reachableCells, cellSize, SELECTED.freeOutline);
  }

  if (attackableEnemies) {
    attackableEnemies.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, cellSize, 'enemy', pulse);
    });
  }

  const produceCells = [...(buildableCells ?? []), ...(spawnableCells ?? [])];
  produceCells.forEach(({ x, y }) => {
    drawMovement(ctx, x, y, cellSize, 'produce');
  });
  if (produceCells.length > 0) {
    drawZoneOutline(ctx, produceCells, cellSize, SELECTED.produceOutline);
  }
};
