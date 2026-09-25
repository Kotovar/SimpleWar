import { TEAM_MARKERS, type Owner } from '@shared/config';
import {
  banner,
  beginEntity,
  OPENING,
  rect,
  shape,
  sideShadow,
  STONE,
  STONE_DARK,
  STONE_LIGHT,
} from './drawEntity';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  banner(ctx, 16, 3, team.color, 11);
  // Стена с зубцами между двумя башнями.
  rect(ctx, STONE, 8, 14, 16, 11);
  for (const x of [11, 15, 19]) rect(ctx, STONE, x, 12, 2.4, 2);
  // Две широкие башни с крышами в цвете стороны отличают базу от одиночной башни.
  rect(ctx, STONE_LIGHT, 3.5, 11, 8, 14);
  rect(ctx, STONE_LIGHT, 20.5, 11, 8, 14);
  sideShadow(ctx, 8.8, 11.6, 2.1, 12.8);
  sideShadow(ctx, 25.8, 11.6, 2.1, 12.8);
  shape(ctx, team.color, [2.5, 11.5, 7.5, 4, 12.5, 11.5]);
  shape(ctx, team.color, [19.5, 11.5, 24.5, 4, 29.5, 11.5]);
  shape(ctx, team.shade, [7.5, 4, 12.5, 11.5, 8.6, 11.5]);
  shape(ctx, team.shade, [24.5, 4, 29.5, 11.5, 25.6, 11.5]);
  // Ворота и окна.
  shape(ctx, OPENING, [13, 25, 13, 19.5, 16, 16.8, 19, 19.5, 19, 25]);
  ctx.fillStyle = '#e8c068';
  ctx.fillRect(6.5, 15, 2, 3);
  ctx.fillRect(23.5, 15, 2, 3);
  ctx.restore();
};

export const drawBarracks = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Длинное казарменное здание с крышей стороны.
  rect(ctx, '#c4bea9', 4, 14, 24, 11);
  sideShadow(ctx, 24, 14.6, 3.4, 9.8);
  shape(ctx, team.color, [2, 15, 7, 8, 25, 8, 30, 15]);
  shape(ctx, team.shade, [25, 8, 30, 15, 26, 15, 21.5, 8.6]);
  shape(ctx, '#3e4047', [12.5, 25, 12.5, 19.5, 16, 17.5, 19.5, 19.5, 19.5, 25]);
  ctx.fillStyle = OPENING;
  ctx.fillRect(6.5, 17.5, 3, 3);
  ctx.fillRect(22.5, 17.5, 3, 3);
  // Щит со скрещёнными мечами над входом.
  shape(ctx, STONE_LIGHT, [13, 9.5, 19, 9.5, 19, 13, 16, 15.5, 13, 13]);
  ctx.strokeStyle = '#6a5f4b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(14.2, 10.5);
  ctx.lineTo(17.8, 13.8);
  ctx.moveTo(17.8, 10.5);
  ctx.lineTo(14.2, 13.8);
  ctx.stroke();
  ctx.restore();
};

export const drawTower = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  banner(ctx, 16, 0.5, team.color, 6);
  // Высокая сужающаяся башня с зубцами.
  shape(ctx, STONE, [9, 25, 10.5, 11, 21.5, 11, 23, 25]);
  shape(ctx, STONE_DARK, [18.5, 11, 21.5, 11, 23, 25, 19.5, 25]);
  shape(
    ctx,
    STONE_LIGHT,
    [
      8, 11.5, 8, 5.5, 11, 5.5, 11, 7.5, 13.5, 7.5, 13.5, 5.5, 18.5, 5.5, 18.5,
      7.5, 21, 7.5, 21, 5.5, 24, 5.5, 24, 11.5,
    ],
  );
  rect(ctx, team.color, 9.3, 11.5, 13.4, 2.4);
  // Бойница и дверь.
  rect(ctx, OPENING, 14.8, 15, 2.4, 4.5);
  shape(ctx, '#4a3a2c', [13.5, 25, 13.5, 22, 16, 20.5, 18.5, 22, 18.5, 25]);
  ctx.restore();
};
