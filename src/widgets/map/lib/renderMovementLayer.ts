import { SELECTED, type Position } from '@shared/config';
import { drawMovement, drawZoneOutline } from './drawMovement';
import { drawStrikeMark } from './drawStrikeMark';

export const renderMovementLayer = (
  ctx: CanvasRenderingContext2D,
  reachableCells: Position[] | null,
  attackableEnemies: Position[] | null,
  buildableCells: Position[] | null,
  spawnableCells: Position[] | null,
  cellSize: number,
  /** Фаза пульсации целей атаки от 0 до 1. */
  pulse = 0,
  /** Размер карты: обводка у её края сдвигается внутрь. */
  map?: { columns: number; rows: number },
  /** Клетки прицела выбранной осадной машины. */
  strikeCells: Position[] | null = null,
  /** Публичные отметки подготовленных ударов всех сторон. */
  strikeMarks: Position[] = [],
) => {
  if (strikeCells?.length) {
    strikeCells.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, cellSize, 'strike');
    });
    drawZoneOutline(ctx, strikeCells, cellSize, SELECTED.enemyOutline, map);
  }
  strikeMarks.forEach(({ x, y }) => drawStrikeMark(ctx, x, y, cellSize));

  if (reachableCells) {
    reachableCells.forEach(({ x, y }) => {
      drawMovement(ctx, x, y, cellSize, 'free');
    });
    drawZoneOutline(ctx, reachableCells, cellSize, SELECTED.freeOutline, map);
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
    drawZoneOutline(ctx, produceCells, cellSize, SELECTED.produceOutline, map);
  }
};
