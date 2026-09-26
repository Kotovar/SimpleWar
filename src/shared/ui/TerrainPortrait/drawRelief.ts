import { beginTerrain } from './beginTerrain';

/**
 * Рисует холм: пологий бугор поверх травы. Проходим за 2 очка, строить можно.
 * Простой рисунок-заглушка; варианты — S18.
 */
export const drawHill = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  beginTerrain(ctx, cellX, cellY, cellSize, false);
  ctx.fillStyle = 'rgba(150, 132, 78, 0.55)';
  ctx.beginPath();
  ctx.ellipse(16, 21, 14, 9, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70, 58, 30, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(16, 21, 14, 9, 0, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(16, 21, 7, 4.5, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
};

/**
 * Рисует болото: тёмная топь с лужами и камышом. Проходимо за 2 очка,
 * строить нельзя. Простой рисунок-заглушка; варианты — S18.
 */
export const drawSwamp = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  beginTerrain(ctx, cellX, cellY, cellSize, false);
  ctx.fillStyle = 'rgba(62, 74, 40, 0.6)';
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = 'rgba(70, 110, 105, 0.85)';
  for (const [x, y, rx, ry] of [
    [10, 12, 6, 3],
    [22, 22, 7, 3.5],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(40, 52, 22, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [x, y, h] of [
    [5, 24, 7],
    [7, 25, 9],
    [26, 11, 7],
    [28, 12, 8],
  ]) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1, y - h);
  }
  ctx.stroke();
  ctx.restore();
};
