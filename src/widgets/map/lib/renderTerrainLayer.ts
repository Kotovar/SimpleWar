import { generateNoise } from '@shared/lib';
import type { Cell } from '@shared/config';
import { drawBackgroundAndGrid } from './drawGrid';
import { drawForest, drawGoldOre, drawMountains } from './drawTerrain';

const TERRAIN_NOISE_AMPLITUDE = 4;

export const renderTerrainLayer = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  cellSize: number,
  gridColumns: number,
) => {
  // Шум покрывает и прямоугольную карту: строк может быть больше, чем колонок.
  const noise = generateNoise(
    Math.max(gridColumns, grid.length),
    TERRAIN_NOISE_AMPLITUDE,
  );

  drawBackgroundAndGrid(ctx, gridColumns, noise, grid, cellSize);

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.type === 'mountain') drawMountains(ctx, x, y, cellSize);
      if (cell.type === 'forest') drawForest(ctx, x, y, cellSize);
      if (cell.type === 'gold') drawGoldOre(ctx, x, y, cellSize);
    }),
  );
};
