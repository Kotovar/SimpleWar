import { TERRAIN } from '@shared/config';
import { shape } from '../EntityPortrait/drawEntity';
import { sample } from '@shared/lib';
import { beginTerrain, variantFor } from './beginTerrain';
import { FOREST_LAYOUTS } from './drawForest';

/** Блик на золотой жиле: заметен даже на мелком масштабе. */
const sparkle = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = '#fffbe6';
  ctx.beginPath();
  ctx.moveTo(x, y - 2.6);
  ctx.lineTo(x + 0.7, y - 0.7);
  ctx.lineTo(x + 2.6, y);
  ctx.lineTo(x + 0.7, y + 0.7);
  ctx.lineTo(x, y + 2.6);
  ctx.lineTo(x - 0.7, y + 0.7);
  ctx.lineTo(x - 2.6, y);
  ctx.lineTo(x - 0.7, y - 0.7);
  ctx.fill();
};

const GOLD_VARIANTS = [
  // Две крупные жилы в пологой скале.
  (ctx: CanvasRenderingContext2D) => {
    shape(
      ctx,
      TERRAIN.colorMountainDark,
      [3, 25, 6, 15, 13, 10, 23, 12, 29, 25],
    );
    // Крупные золотые грани отличают месторождение от обычной скалы.
    shape(ctx, TERRAIN.colorOreDark, [6, 24, 7, 15, 13, 11, 18, 15, 15, 25]);
    shape(ctx, TERRAIN.colorOreLight, [7, 15, 13, 11, 18, 15, 12, 18]);
    shape(ctx, TERRAIN.colorOreDark, [17, 25, 18, 18, 23, 15, 28, 21, 26, 25]);
    shape(ctx, TERRAIN.colorOreLight, [18, 18, 23, 15, 26, 19, 22, 21]);
    sparkle(ctx, 12, 13.5);
  },
  // Одна жила в высокой скале и самородки у подножия.
  (ctx: CanvasRenderingContext2D) => {
    shape(
      ctx,
      TERRAIN.colorMountainDark,
      [4, 25, 9, 12, 17, 6, 25, 14, 28, 25],
    );
    shape(ctx, TERRAIN.colorMountainLight, [4, 25, 9, 12, 17, 6, 16, 25]);
    shape(ctx, TERRAIN.colorOreDark, [10, 23, 12, 13, 17, 9, 21, 14, 19, 23]);
    shape(ctx, TERRAIN.colorOreLight, [12, 13, 17, 9, 21, 14, 15, 16]);
    shape(ctx, TERRAIN.colorOreDark, [23, 25, 24, 21, 27, 20, 29, 25]);
    shape(ctx, TERRAIN.colorOreLight, [24, 21, 27, 20, 27, 23]);
    sparkle(ctx, 16.5, 11.5);
  },
  // Скала с жилами на двух уровнях и самородками у подножия.
  (ctx: CanvasRenderingContext2D) => {
    shape(
      ctx,
      TERRAIN.colorMountainDark,
      [2, 25, 6, 14, 12, 8, 20, 10, 26, 16, 30, 25],
    );
    shape(ctx, TERRAIN.colorMountainLight, [2, 25, 6, 14, 12, 8, 15, 25]);
    shape(ctx, TERRAIN.colorOreDark, [7, 19, 11, 9, 18, 12, 15, 21]);
    shape(ctx, TERRAIN.colorOreLight, [11, 9, 18, 12, 14, 15]);
    shape(ctx, TERRAIN.colorOreDark, [16, 25, 19, 15, 25, 18, 23, 25]);
    shape(ctx, TERRAIN.colorOreLight, [19, 15, 25, 18, 20, 20]);
    shape(ctx, TERRAIN.colorOreDark, [3, 25, 6, 20, 11, 20, 12, 25]);
    shape(ctx, TERRAIN.colorOreLight, [6, 20, 11, 20, 9, 23]);
    sparkle(ctx, 22, 16.5);
  },
];

/** Сдвиг и растяжение по высоте: одинаковые варианты не выстраиваются в узор. */
const withJitter = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  draw: () => void,
) => {
  const stretch = 0.9 + sample(cellX, cellY, 401) * 0.18;
  ctx.save();
  ctx.translate(16 + (sample(cellX, cellY, 409) - 0.5) * 3, 25);
  ctx.scale(1, stretch);
  ctx.translate(-16, -25);
  draw();
  ctx.restore();
};

export const drawGoldOre = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  variant = variantFor(cellX, cellY, 331, GOLD_VARIANTS.length),
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  withJitter(ctx, cellX, cellY, () => GOLD_VARIANTS[variant](ctx));
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
    shape(ctx, TERRAIN.colorMountainDark, [1, 25, 8, 11, 15, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [20, 25, 26, 9, 31, 25]);
    shape(ctx, TERRAIN.colorMountainLight, [8, 25, 18, 6, 28, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [18, 6, 28, 25, 19.5, 25]);
  },
  // Широкий массив с двумя снежными вершинами и валуном.
  (ctx: CanvasRenderingContext2D) => {
    shape(
      ctx,
      TERRAIN.colorMountainLight,
      [1, 25, 9, 8, 15, 16, 20, 5, 30, 25],
    );
    shape(ctx, TERRAIN.colorMountainDark, [9, 8, 13, 25, 4, 25]);
    shape(ctx, TERRAIN.colorMountainDark, [20, 5, 30, 25, 21, 25]);
    shape(ctx, TERRAIN.colorMountainSnow, [6, 13, 9, 8, 12, 12.5, 9.5, 11.5]);
    shape(
      ctx,
      TERRAIN.colorMountainSnow,
      [16.5, 11, 20, 5, 24, 12, 21.5, 10.5, 19.5, 12],
    );
    shape(ctx, TERRAIN.colorMountainDark, [23, 25, 24.5, 21, 28, 21.5, 29, 25]);
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
  withJitter(ctx, cellX, cellY, () => MOUNTAIN_VARIANTS[variant](ctx));
  ctx.restore();
};

/** Число вариантов рисунка по типам: для витрины в Storybook. */
export const TERRAIN_VARIANTS = {
  forest: FOREST_LAYOUTS.length,
  mountain: MOUNTAIN_VARIANTS.length,
  gold: GOLD_VARIANTS.length,
};
