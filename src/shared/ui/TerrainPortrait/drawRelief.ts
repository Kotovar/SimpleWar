import { beginTerrain, variantFor } from './beginTerrain';

export const HILLS = [
  [14, 11, 23, 16],
  [17, 10, 9, 17],
  [13, 12, 23, 15],
] as const;

export const SWAMPS = [
  [
    [11, 14, 6, 3],
    [21, 22, 6, 3],
  ],
  [
    [20, 14, 6, 3],
    [11, 22, 6, 3],
  ],
  [
    [12, 15, 6, 3],
    [21, 21, 5, 3],
  ],
] as const;

/** Три близких силуэта пологих травяных холмов; вариант устойчив по координатам. */
export const drawHill = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  variant = variantFor(cellX, cellY, 743, HILLS.length),
) => {
  beginTerrain(ctx, cellX, cellY, cellSize);
  const [peakX, peakY, rearX, rearY] = HILLS[variant];
  ctx.fillStyle = '#598052';
  ctx.beginPath();
  ctx.moveTo(4, 25);
  ctx.bezierCurveTo(rearX - 8, rearY, rearX, rearY - 5, 28, 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#87a366';
  ctx.beginPath();
  ctx.moveTo(3, 25);
  ctx.bezierCurveTo(6, 21, peakX - 6, peakY, peakX, peakY);
  ctx.bezierCurveTo(peakX + 6, peakY, 24, 22, 29, 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#62834f';
  ctx.beginPath();
  ctx.moveTo(peakX, peakY);
  ctx.bezierCurveTo(peakX + 6, peakY, 24, 22, 29, 25);
  ctx.lineTo(16, 25);
  ctx.quadraticCurveTo(peakX + 4, 20, peakX, peakY);
  ctx.fill();
  ctx.strokeStyle = '#afbb7e';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(7, 21);
  ctx.quadraticCurveTo(peakX - 3, peakY + 2, peakX, peakY + 2);
  ctx.stroke();
  ctx.restore();
};

/** Неглубокие заводи и камыш; общая подложка болота рисуется под берегом. */
export const drawSwamp = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  variant = variantFor(cellX, cellY, 829, SWAMPS.length),
) => {
  beginTerrain(ctx, cellX, cellY, cellSize, false);
  ctx.lineCap = 'round';
  for (const [x, y, rx, ry] of SWAMPS[variant]) {
    ctx.fillStyle = '#526e4d';
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 1, ry + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#648d80';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94afa0';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 2, y);
    ctx.stroke();
    ctx.strokeStyle = '#3e6040';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 1);
    ctx.lineTo(x - 4, y - 5);
    ctx.moveTo(x - 3, y + 1);
    ctx.lineTo(x - 1, y - 3);
    ctx.moveTo(x - 3, y + 1);
    ctx.lineTo(x - 6, y - 2);
    ctx.stroke();
    ctx.strokeStyle = '#82734c';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 5);
    ctx.lineTo(x - 4.3, y - 7);
    ctx.stroke();
  }
  ctx.restore();
};
