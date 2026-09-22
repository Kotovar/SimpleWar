import { TERRAIN } from '@shared/config';
import { rect, shape } from './drawEntity';
import { drawSelectionHighlight } from './drawSelectionHighlight';

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

// Вариация зависит только от координат: клетка выглядит одинаково при перерисовке.
const variantFor = (
  cellX: number,
  cellY: number,
  salt: number,
  count: number,
) => {
  let value =
    Math.imul(cellX + 1, 374761393) ^ Math.imul(cellY + 1, 668265263) ^ salt;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) % count;
};

const FOREST_VARIANTS = [
  // Две ели: крупная слева, поменьше справа.
  (ctx: CanvasRenderingContext2D) => {
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
  },
  // Три ели разной высоты — густой участок леса.
  (ctx: CanvasRenderingContext2D) => {
    rect(ctx, TERRAIN.colorForestTrunk, 4, 20, 2, 6);
    shape(
      ctx,
      TERRAIN.colorForestCrown,
      [1, 22, 4, 16, 2.5, 16, 5, 9, 7.5, 16, 6, 16, 9, 22],
    );
    shape(ctx, TERRAIN.colorForestLight, [4, 16, 5, 9, 5, 16]);
    rect(ctx, TERRAIN.colorForestTrunk, 24, 21, 2, 5);
    shape(
      ctx,
      TERRAIN.colorForestCrown,
      [21, 23, 24, 17, 22.5, 17, 25, 10, 27.5, 17, 26, 17, 29, 23],
    );
    shape(ctx, TERRAIN.colorForestLight, [24, 17, 25, 10, 25, 17]);
    rect(ctx, TERRAIN.colorForestTrunk, 15, 19, 3, 8);
    shape(
      ctx,
      TERRAIN.colorForestCrown,
      [10, 22, 13.5, 14, 12, 14, 16.5, 5, 21, 14, 19.5, 14, 23, 22],
    );
    shape(ctx, TERRAIN.colorForestLight, [13.5, 14, 16.5, 5, 16.5, 14]);
  },
  // Лиственные кроны: округлые силуэты вместо острых елей.
  (ctx: CanvasRenderingContext2D) => {
    rect(ctx, TERRAIN.colorForestTrunk, 24, 19, 2, 7);
    shape(
      ctx,
      TERRAIN.colorForestCrown,
      [
        20.5, 16, 21.8, 12.8, 25, 11.5, 28.2, 12.8, 29.5, 16, 28.2, 19.2, 25,
        20.5, 21.8, 19.2,
      ],
    );
    shape(
      ctx,
      TERRAIN.colorForestLight,
      [20.5, 16, 21.8, 12.8, 25, 11.5, 25, 16],
    );
    rect(ctx, TERRAIN.colorForestTrunk, 11, 17, 4, 9);
    shape(
      ctx,
      TERRAIN.colorForestCrown,
      [
        5, 13, 7.3, 7.3, 13, 5, 18.7, 7.3, 21, 13, 18.7, 18.7, 13, 21, 7.3,
        18.7,
      ],
    );
    shape(ctx, TERRAIN.colorForestLight, [5, 13, 7.3, 7.3, 13, 5, 13, 13]);
  },
];

export const drawForest = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  variant = variantFor(cellX, cellY, 53, FOREST_VARIANTS.length),
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  FOREST_VARIANTS[variant](ctx);
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

const MOUNTAIN_VARIANTS = [
  // Двойная вершина со снежной шапкой.
  (ctx: CanvasRenderingContext2D) => {
    shape(ctx, TERRAIN.colorMountainDark, [14, 25, 23, 9, 30, 25]);
    shape(ctx, TERRAIN.colorMountainLight, [2, 25, 13, 4, 25, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [13, 4, 25, 25, 15, 25]);
    shape(
      ctx,
      TERRAIN.colorMountainSnow,
      [8, 14, 13, 4, 19, 15, 15, 13, 12, 15, 11, 12],
    );
  },
  // Одиночный острый пик.
  (ctx: CanvasRenderingContext2D) => {
    shape(ctx, TERRAIN.colorMountainLight, [3, 25, 16, 3, 29, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [16, 3, 29, 25, 18, 25]);
    shape(
      ctx,
      TERRAIN.colorMountainSnow,
      [11, 13, 16, 3, 21, 13, 19, 11, 16, 13, 13, 11],
    );
  },
  // Низкая гряда из трёх скал без снега.
  (ctx: CanvasRenderingContext2D) => {
    shape(ctx, TERRAIN.colorMountainDark, [2, 25, 8, 14, 14, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [20, 25, 26, 12, 31, 25]);
    shape(ctx, TERRAIN.colorMountainLight, [9, 25, 18, 9, 27, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [18, 9, 27, 25, 19.5, 25]);
  },
];

export const drawMountains = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  variant = variantFor(cellX, cellY, 911, MOUNTAIN_VARIANTS.length),
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  MOUNTAIN_VARIANTS[variant](ctx);
  ctx.restore();
};

export const drawTerrainHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  drawSelectionHighlight(ctx, cellX, cellY, cellSize, 'cell');
};
