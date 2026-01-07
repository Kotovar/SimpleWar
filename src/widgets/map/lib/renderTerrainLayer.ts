import { Cell, CELL_SIZE, GRID_SIZE } from '@shared/config';
import { drawBackgroundAndGrid } from './drawGrid';
import { drawForest, drawGoldOre, drawMountains } from './drawTerrain';

const generateNoise = (gridSize: number, amplitude: number) => {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => (Math.random() - 0.5) * amplitude),
  );
};

export const renderTerrainLayer = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
) => {
  const noise = generateNoise(GRID_SIZE, 4);

  drawBackgroundAndGrid(ctx, GRID_SIZE, noise, grid);

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.type === 'mountain') drawMountains(ctx, x, y, CELL_SIZE);
      if (cell.type === 'forest') drawForest(ctx, x, y, CELL_SIZE);
      if (cell.type === 'gold') drawGoldOre(ctx, x, y, CELL_SIZE);
    }),
  );
};
