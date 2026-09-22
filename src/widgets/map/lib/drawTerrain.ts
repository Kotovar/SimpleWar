import { TERRAIN } from '@shared/config';
import { rect, shape } from './drawEntity';

const beginTerrain = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#292c30';
  ctx.fillStyle = TERRAIN.colorShadow;
  ctx.beginPath();
  ctx.ellipse(16, 26, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();
};

export const drawForest = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  rect(ctx, TERRAIN.colorForestTrunk, 8, 18, 3, 8);
  shape(
    ctx,
    TERRAIN.colorForestCrown,
    [2, 21, 5, 15, 3, 15, 9, 4, 15, 15, 13, 15, 17, 21],
  );
  shape(ctx, TERRAIN.colorForestLight, [5, 15, 9, 4, 9, 15]);
  rect(ctx, TERRAIN.colorForestTrunk, 21, 21, 3, 6);
  shape(
    ctx,
    TERRAIN.colorForestCrown,
    [14, 24, 18, 17, 16, 17, 22, 7, 28, 17, 26, 17, 30, 24],
  );
  shape(ctx, TERRAIN.colorForestLight, [18, 17, 22, 7, 22, 17]);
  ctx.restore();
};

export const drawGoldOre = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  shape(ctx, TERRAIN.colorMountainDark, [3, 25, 6, 15, 13, 10, 23, 12, 29, 25]);
  // Крупные золотые грани отличают месторождение от обычной скалы.
  shape(ctx, TERRAIN.colorOreDark, [6, 24, 7, 15, 13, 11, 18, 15, 15, 25]);
  shape(ctx, TERRAIN.colorOreLight, [7, 15, 13, 11, 18, 15, 12, 18]);
  shape(ctx, TERRAIN.colorOreDark, [17, 25, 18, 18, 23, 15, 28, 21, 26, 25]);
  shape(ctx, TERRAIN.colorOreLight, [18, 18, 23, 15, 26, 19, 22, 21]);
  ctx.restore();
};

export const drawMountains = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  shape(ctx, TERRAIN.colorMountainDark, [14, 25, 23, 9, 30, 25]);
  shape(ctx, TERRAIN.colorMountainLight, [2, 25, 13, 4, 25, 25]);
  shape(ctx, TERRAIN.colorMountainDark, [13, 4, 25, 25, 15, 25]);
  shape(
    ctx,
    TERRAIN.colorMountainSnow,
    [8, 14, 13, 4, 19, 15, 15, 13, 12, 15, 11, 12],
  );
  ctx.restore();
};

export const drawTerrainHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  ctx.strokeStyle = TERRAIN.colorSelectedTerrain;
  ctx.lineWidth = TERRAIN.lineThickness * 2;
  ctx.beginPath();
  ctx.strokeRect(
    baseX + TERRAIN.lineThickness * 3,
    baseY + TERRAIN.lineThickness * 3,
    cellSize - TERRAIN.lineThickness * 6,
    cellSize - TERRAIN.lineThickness * 6,
  );
  ctx.stroke();
};
