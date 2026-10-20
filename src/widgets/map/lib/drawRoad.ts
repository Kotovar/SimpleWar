import type { Cell } from '@shared/config';

/** Стороны клетки: смещение соседа и направление полосы от центра. */
const SIDES = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/**
 * Полоса от центра клетки к стороне в координатах 32×32.
 *
 * @param half - Половина ширины полосы.
 */
const band = (
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  half: number,
) => {
  if (dx) ctx.rect(dx < 0 ? 0 : 16, 16 - half, 16, half * 2);
  else ctx.rect(16 - half, dy < 0 ? 0 : 16, half * 2, 16);
};

/**
 * Рисует грунтовую дорогу на клетке: полосы к соседним дорогам
 * сходятся в центре, поэтому прямые, углы, развилки и перекрёстки
 * получаются сами. Одиночная дорога — утоптанная площадка.
 *
 * @param grid - Местность: по ней ищутся соседние дороги.
 */
export const drawRoad = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  x: number,
  y: number,
  cellSize: number,
) => {
  const sides = SIDES.filter(([dx, dy]) => grid[y + dy]?.[x + dx]?.road);
  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);

  // Обочина, затем полотно поверх: стык соседних клеток без шва.
  for (const [color, half] of [
    ['#7f6a48', 8],
    ['#c8ab78', 6.5],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(16, 16, half, 0, Math.PI * 2);
    for (const [dx, dy] of sides) band(ctx, dx, dy, half);
    ctx.fill();
  }

  // Колея: две тёмные линии вдоль каждой полосы.
  ctx.strokeStyle = 'rgba(110, 88, 56, 0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const [dx, dy] of sides) {
    for (const offset of [-2.6, 2.6]) {
      ctx.moveTo(16 + (dy ? offset : 0), 16 + (dx ? offset : 0));
      ctx.lineTo(
        16 + dx * 16 + (dy ? offset : 0),
        16 + dy * 16 + (dx ? offset : 0),
      );
    }
  }
  ctx.stroke();
  ctx.restore();
};
