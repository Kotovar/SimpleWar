import { TERRAIN } from '@shared/config';
import { sample } from '@shared/lib';

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

// Вариация зависит только от координат: клетка выглядит одинаково при перерисовке.
export const variantFor = (
  cellX: number,
  cellY: number,
  salt: number,
  count: number,
) => Math.floor(sample(cellX, cellY, salt) * count);
