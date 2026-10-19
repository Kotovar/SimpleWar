import { TERRAIN } from '@shared/config';
import { circle, shape } from '../EntityPortrait/drawEntity';
import { sample, smoothNoise } from '@shared/lib';
import { beginTerrain, variantFor } from './beginTerrain';

/** Ель из двух ярусов; `x, y` — основание ствола, `size` — масштаб. */
const drawConifer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  const w = 6.5 * size;
  shape(ctx, TERRAIN.colorForestTrunk, [
    x - 1,
    y,
    x - 1,
    y - 4,
    x + 1,
    y - 4,
    x + 1,
    y,
  ]);
  shape(ctx, TERRAIN.colorForestCrown, [
    x - w,
    y - 3.5 * size,
    x,
    y - 13 * size,
    x + w,
    y - 3.5 * size,
  ]);
  shape(ctx, TERRAIN.colorForestCrown, [
    x - w * 0.78,
    y - 8.5 * size,
    x,
    y - 18 * size,
    x + w * 0.78,
    y - 8.5 * size,
  ]);
  // Освещённая левая грань без обводки: объём без лишних линий.
  ctx.fillStyle = TERRAIN.colorForestLight;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, y - 9.7 * size);
  ctx.lineTo(x - 0.4, y - 17 * size);
  ctx.lineTo(x - 0.4, y - 9.7 * size);
  ctx.moveTo(x - w * 0.8, y - 4.2 * size);
  ctx.lineTo(x - 0.4, y - 11.8 * size);
  ctx.lineTo(x - 0.4, y - 4.2 * size);
  ctx.fill();
};

/** Лиственное дерево с круглой кроной. */
const drawLeafy = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  const r = 5.6 * size;
  shape(ctx, TERRAIN.colorForestTrunk, [
    x - 1.2,
    y,
    x - 1,
    y - 6,
    x + 1,
    y - 6,
    x + 1.2,
    y,
  ]);
  circle(ctx, TERRAIN.colorLeafCrown, x, y - 6 - r * 0.8, r);
  ctx.fillStyle = TERRAIN.colorLeafLight;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - 6 - r * 1.1, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
};

/** Раскладки деревьев в клетке: `[x, y, size]` в координатах 32×32. */
export const FOREST_LAYOUTS: (readonly [number, number, number])[][] = [
  // Две крупные кроны.
  [
    [10, 21, 1.05],
    [22, 25, 0.95],
  ],
  // Три дерева: густой участок.
  [
    [7, 18, 0.78],
    [24, 19, 0.8],
    [15, 27, 0.95],
  ],
  // Одно большое дерево и подрост.
  [
    [14, 24, 1.15],
    [25, 17, 0.62],
  ],
  // Четыре молодых дерева.
  [
    [8, 16, 0.66],
    [21, 14, 0.62],
    [12, 26, 0.74],
    [25, 26, 0.7],
  ],
];

/**
 * Рисует лес с устойчивым расположением и породами деревьев для клетки.
 *
 * @param ctx - Контекст холста.
 * @param cellX - Столбец клетки.
 * @param cellY - Строка клетки.
 * @param cellSize - Размер клетки в пикселях.
 * @param variant - Номер раскладки; по умолчанию зависит от координат.
 */
export const drawForest = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  variant = variantFor(cellX, cellY, 53, FOREST_LAYOUTS.length),
) => {
  beginTerrain(ctx, cellX, cellY, cellSize, false);
  // Хвойные и лиственные рощи занимают разные участки карты, а не чередуются.
  const coniferShare = smoothNoise(cellX, cellY, 5, 97);

  FOREST_LAYOUTS[variant].forEach(([x, y, size], index) => {
    const jitter = (salt: number) =>
      (sample(cellX, cellY, salt + index) - 0.5) * 3;
    const treeX = x + jitter(11);
    const treeY = y + jitter(29) * 0.5;
    const isConifer =
      sample(cellX, cellY, 71 + index) < 0.25 + coniferShare * 0.6;

    ctx.fillStyle = 'rgba(16, 36, 22, 0.3)';
    ctx.beginPath();
    ctx.ellipse(treeX + 1, treeY, 5.5 * size, 1.8 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isConifer) drawConifer(ctx, treeX, treeY, size);
    else drawLeafy(ctx, treeX, treeY, size);
  });
  ctx.restore();
};
