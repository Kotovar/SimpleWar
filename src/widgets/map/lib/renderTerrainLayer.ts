import type { Cell } from '@shared/config';
import { drawBackgroundAndGrid } from './drawGrid';
import { drawClearing } from './drawClearing';
import { sample } from '@shared/lib';
import {
  drawForest,
  drawGoldOre,
  drawHill,
  drawMountains,
  drawSwamp,
} from './drawTerrain';

const TERRAIN_NOISE_AMPLITUDE = 6;

export const renderTerrainLayer = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  cellSize: number,
  gridColumns: number,
  /** Клетки под зданиями в виде `"x,y"`: на них рисуется расчищенная площадка. */
  builtCells: ReadonlySet<string> = new Set(),
) => {
  // Оттенок клетки зависит только от координат: при масштабировании и
  // перерисовке карта не перемигивает.
  const noise = grid.map((row, y) =>
    row.map((_, x) => (sample(x, y, 5) - 0.5) * TERRAIN_NOISE_AMPLITUDE),
  );

  drawBackgroundAndGrid(ctx, gridColumns, noise, grid, cellSize, builtCells);

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (builtCells.has(`${x},${y}`)) {
        drawClearing(ctx, x, y, cellSize, cell.type);
        return;
      }
      if (cell.type === 'mountain') drawMountains(ctx, x, y, cellSize);
      if (cell.type === 'forest') drawForest(ctx, x, y, cellSize);
      if (cell.type === 'gold') drawGoldOre(ctx, x, y, cellSize);
      if (cell.type === 'hill') drawHill(ctx, x, y, cellSize);
      if (cell.type === 'swamp') drawSwamp(ctx, x, y, cellSize);
    }),
  );
};
