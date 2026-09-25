import { TEAM_MARKERS, type Owner } from '@shared/config';
import {
  beginEntity,
  circle,
  OPENING,
  rect,
  shape,
  sideShadow,
  TIMBER,
} from './drawEntity';

export const drawGoldMine = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Скала со входом в штольню.
  shape(ctx, '#8b918c', [2.5, 25, 5, 15, 11, 8.5, 20, 9, 27, 15, 29.5, 25]);
  shape(ctx, '#b6bcae', [5, 15, 11, 8.5, 20, 9, 15, 13.5]);
  shape(ctx, OPENING, [10.5, 25, 10.5, 17, 16, 14.5, 21.5, 17, 21.5, 25]);
  rect(ctx, TIMBER, 9, 15.5, 2.4, 9.5);
  rect(ctx, TIMBER, 20.6, 15.5, 2.4, 9.5);
  // Балка над входом в цвете стороны.
  rect(ctx, team.color, 8, 13.2, 16, 2.8);
  // Вагонетка с золотом — главный признак рудника.
  shape(ctx, '#f5cd53', [15.5, 20.5, 17, 17.5, 19.5, 18.8, 21.5, 17, 23, 20.5]);
  rect(ctx, '#5d4a3a', 14.5, 20.5, 9.5, 4);
  circle(ctx, '#2b2f33', 16.8, 25.2, 1.2);
  circle(ctx, '#2b2f33', 21.7, 25.2, 1.2);
  ctx.restore();
};

export const drawSawmill = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Дощатый сарай под крышей стороны.
  rect(ctx, '#b88b58', 4.5, 14, 16, 11);
  ctx.strokeStyle = 'rgba(60, 40, 24, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const x of [8.5, 12.5, 16.5]) {
    ctx.moveTo(x, 14.6);
    ctx.lineTo(x, 24.4);
  }
  ctx.stroke();
  ctx.strokeStyle = '#292c30';
  ctx.lineWidth = 1.2;
  shape(ctx, team.color, [2.5, 15, 8.5, 7.5, 16.5, 7.5, 22.5, 15]);
  shape(ctx, team.shade, [16.5, 7.5, 22.5, 15, 18.8, 15, 13.5, 8.5]);
  rect(ctx, '#4a3a2c', 7, 18, 5, 7);
  // Дисковая пила и светлые торцы брёвен — опознавательные признаки лесопилки.
  circle(ctx, '#d5dde0', 16, 20.5, 2.8);
  ctx.fillStyle = '#7f8b90';
  ctx.beginPath();
  ctx.arc(16, 20.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y] of [
    [21.5, 23],
    [26.3, 23],
    [23.9, 19],
  ]) {
    circle(ctx, '#e8bf80', x, y, 2.4);
    ctx.fillStyle = '#b08250';
    ctx.beginPath();
    ctx.arc(x, y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const drawFarm = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Поле пшеницы перед амбаром.
  shape(ctx, '#d9b24e', [2.5, 25, 4.5, 18.5, 14, 18.5, 13, 25]);
  ctx.strokeStyle = '#a57f2a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const y of [20.5, 22.8]) {
    ctx.moveTo(4.4, y);
    ctx.lineTo(13.4, y);
  }
  ctx.stroke();
  ctx.strokeStyle = '#292c30';
  ctx.lineWidth = 1.2;
  // Амбар под крышей стороны.
  rect(ctx, '#d6b88c', 13.5, 13.5, 14, 11.5);
  sideShadow(ctx, 24, 14.1, 2.9, 10.3);
  shape(ctx, team.color, [11.5, 14, 20.5, 6, 29.5, 14]);
  shape(ctx, team.shade, [20.5, 6, 29.5, 14, 25, 14]);
  rect(ctx, '#6b4c35', 18, 18, 5, 7);
  ctx.strokeStyle = '#d6b88c';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(18.5, 18.5);
  ctx.lineTo(22.5, 24.5);
  ctx.moveTo(22.5, 18.5);
  ctx.lineTo(18.5, 24.5);
  ctx.stroke();
  ctx.fillStyle = '#f3eedd';
  ctx.beginPath();
  ctx.arc(20.5, 11, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
