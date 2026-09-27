import { TEAM_MARKERS, type Owner } from '@shared/config';
import {
  beginEntity,
  circle,
  OPENING,
  rect,
  shape,
  sideShadow,
  STONE,
  STONE_DARK,
  TIMBER,
} from './drawEntity';

/** Конюшня: деревянный сарай с широкими воротами и подковой. */
export const drawStable = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  rect(ctx, TIMBER, 4, 13, 24, 12);
  sideShadow(ctx, 24, 13.6, 3.4, 10.8);
  shape(ctx, team.color, [2, 14, 16, 5.5, 30, 14]);
  shape(ctx, team.shade, [16, 5.5, 30, 14, 25, 14]);
  // Широкие ворота с диагональной перекладиной.
  rect(ctx, '#6e4d31', 10, 16.5, 12, 8.5);
  ctx.strokeStyle = '#c9a36a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10.5, 17);
  ctx.lineTo(21.5, 24.5);
  ctx.moveTo(16, 16.5);
  ctx.lineTo(16, 25);
  ctx.stroke();
  // Подкова над воротами.
  ctx.strokeStyle = '#dfe3d8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(16, 12, 2.4, Math.PI * 0.1, Math.PI * 0.9, true);
  ctx.stroke();
  ctx.restore();
};

/** Мастерская: навес с шестернёй и бревном под катапульту. */
export const drawWorkshop = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  rect(ctx, '#b89a6e', 5, 14, 22, 11);
  sideShadow(ctx, 23, 14.6, 3.4, 9.8);
  shape(ctx, team.color, [3, 15, 8, 9, 24, 9, 29, 15]);
  rect(ctx, OPENING, 8, 17.5, 8, 7.5);
  // Бревно у входа.
  rect(ctx, '#8a6238', 17.5, 21.5, 8, 2.4);
  // Шестерня на фронтоне.
  circle(ctx, STONE, 16, 11.8, 2.6);
  ctx.fillStyle = OPENING;
  ctx.beginPath();
  ctx.arc(16, 11.8, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** Кузница: каменный дом с трубой и наковальней у входа. */
export const drawForge = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Труба с огоньком.
  rect(ctx, STONE_DARK, 20, 4, 4, 8);
  circle(ctx, '#f2a541', 22, 3.5, 1.4);
  rect(ctx, STONE, 5, 13, 20, 12);
  sideShadow(ctx, 21, 13.6, 3.4, 10.8);
  shape(ctx, team.color, [3, 14, 10, 8, 20, 8, 27, 14]);
  rect(ctx, '#e8743b', 9, 17, 5, 4);
  // Наковальня.
  shape(
    ctx,
    '#4d5358',
    [18, 20, 27.5, 20, 25.5, 22, 23.5, 22, 23.5, 25, 21, 25, 21, 22, 19.5, 22],
  );
  ctx.restore();
};

/** Святилище: храм с куполом и светящимся окном — место найма магии. */
export const drawSanctuary = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  rect(ctx, '#e6e1d3', 6, 14, 20, 11);
  sideShadow(ctx, 22, 14.6, 3.4, 9.8);
  // Колонны.
  for (const x of [7.5, 12, 18.5, 23]) rect(ctx, '#f6f2e6', x, 15, 1.6, 10);
  // Купол стороны.
  ctx.fillStyle = team.color;
  ctx.beginPath();
  ctx.arc(16, 14, 7, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rect(ctx, '#e8d9a8', 15.2, 4, 1.6, 3.5);
  // Светящийся вход.
  shape(ctx, '#c9a8ff', [14, 25, 14, 19, 16, 17.5, 18, 19, 18, 25]);
  ctx.restore();
};
