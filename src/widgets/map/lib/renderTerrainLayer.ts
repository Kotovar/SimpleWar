import { CANVAS_SIZE, Cell, CELL_SIZE, GRID_SIZE } from '@shared/config';
import { drawBackgroundAndGrid } from './drawGrid';
import {
  drawForest,
  drawGoldOre,
  drawMountains,
  drawWater,
} from './drawTerrain';

export const renderTerrainLayer = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
) => {
  drawBackgroundAndGrid(ctx, CANVAS_SIZE, CELL_SIZE, GRID_SIZE);

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.type === 'water') drawWater(ctx, x, y, CELL_SIZE);
      if (cell.type === 'mountain') drawMountains(ctx, x, y, CELL_SIZE);
      if (cell.type === 'forest') drawForest(ctx, x, y, CELL_SIZE);
      if (cell.type === 'gold') drawGoldOre(ctx, x, y, CELL_SIZE);
    }),
  );
};
