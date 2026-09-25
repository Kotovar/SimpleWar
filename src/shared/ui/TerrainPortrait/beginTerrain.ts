import { TERRAIN } from '@shared/config';
import { sample } from '@shared/lib';

/**
 * Подготавливает холст для рисунка рельефа в координатах 32×32.
 * Вызывающий код завершает рисунок через `ctx.restore()`.
 *
 * @param ctx - Контекст холста.
 * @param cellX - Столбец клетки.
 * @param cellY - Строка клетки.
 * @param cellSize - Размер клетки в пикселях.
 * @param shadow - Нужно ли рисовать общую тень рельефа.
 */
export const beginTerrain = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  shadow = true,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#292c30';
  if (!shadow) return;
  ctx.fillStyle = TERRAIN.colorShadow;
  ctx.beginPath();
  ctx.ellipse(16, 26, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Выбирает устойчивый вариант рисунка по координатам клетки.
 *
 * @param cellX - Столбец клетки.
 * @param cellY - Строка клетки.
 * @param salt - Значение, разделяющее наборы вариантов.
 * @param count - Число доступных вариантов.
 * @returns Индекс варианта от нуля до `count - 1`.
 */
export const variantFor = (
  cellX: number,
  cellY: number,
  salt: number,
  count: number,
) => Math.floor(sample(cellX, cellY, salt) * count);
