import { type Owner } from '@shared/config';
import { beginEntity, rect, shape } from './drawEntity';

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#48525b', 11, 20, 4, 5);
  rect(ctx, '#48525b', 17, 20, 4, 5);
  shape(ctx, '#a9bbc3', [10, 13, 20, 13, 22, 21, 9, 21]);
  rect(ctx, '#e3bd8b', 12, 8, 7, 6);
  shape(ctx, '#dbe4df', [10, 10, 11, 6, 19, 6, 21, 10]);
  // Меч вынесен за силуэт; широкий щит узнаётся и на маленьком масштабе.
  shape(ctx, '#edf2df', [24, 6, 26, 10, 25, 20, 23, 20, 23, 10]);
  rect(ctx, '#d6b265', 21, 19, 6, 2);
  shape(ctx, '#748d99', [5, 14, 12, 14, 13, 21, 9, 25, 5, 21]);
  ctx.fillStyle = '#e0e2cf';
  ctx.fillRect(8, 16, 2, 6);
  ctx.restore();
};

export const drawArcher = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#5d493b', 10, 20, 4, 5);
  rect(ctx, '#5d493b', 16, 20, 4, 5);
  shape(ctx, '#768563', [10, 12, 17, 12, 21, 22, 6, 22]);
  shape(ctx, '#566b51', [8, 12, 9, 8, 14, 4, 19, 8, 20, 13]);
  rect(ctx, '#ebc899', 12, 9, 5, 5);
  // Лук занимает всю высоту фигуры, тетива не сливается с корпусом.
  ctx.strokeStyle = '#292c30';
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(23, 6);
  ctx.quadraticCurveTo(32, 15, 23, 24);
  ctx.stroke();
  ctx.strokeStyle = '#e4b875';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = '#f6e9c7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(23, 6);
  ctx.lineTo(22, 15);
  ctx.lineTo(23, 24);
  ctx.moveTo(17, 15);
  ctx.lineTo(29, 15);
  ctx.stroke();
  ctx.restore();
};

export const drawWorker = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  rect(ctx, '#58483d', 10, 20, 4, 5);
  rect(ctx, '#58483d', 17, 20, 4, 5);
  shape(ctx, '#dab887', [9, 13, 20, 13, 22, 19, 8, 19]);
  rect(ctx, '#927052', 11, 14, 8, 8);
  rect(ctx, '#efc99b', 11, 8, 8, 6);
  shape(ctx, '#dfbb62', [8, 10, 10, 6, 19, 6, 21, 10]);
  rect(ctx, '#edce7b', 7, 10, 15, 2);
  rect(ctx, '#bd915c', 24, 11, 2, 13);
  rect(ctx, '#c3cfd0', 20, 7, 10, 6);
  ctx.restore();
};
