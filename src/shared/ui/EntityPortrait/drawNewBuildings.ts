import { TEAM_MARKERS, type Owner, type TeamStyle } from '@shared/config';
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
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale, team);
  rect(ctx, TIMBER, 4, 13, 24, 12);
  sideShadow(ctx, 24, 13.6, 3.4, 10.8);
  shape(ctx, team.color, [2, 14, 16, 5.5, 30, 14]);
  shape(ctx, team.shade, [16, 5.5, 30, 14, 25, 14]);
  // Широкие двустворчатые ворота.
  rect(ctx, '#6e4d31', 10, 16.5, 12, 8.5);
  ctx.strokeStyle = '#c9a36a';
  ctx.lineWidth = 1;
  ctx.beginPath();
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
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale, team);
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
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale, team);
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
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale, team);
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

/** Частокол (Инженерия): ряд заострённых кольев с цветной перевязью. */
export const drawPalisade = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale, team);
  for (let x = 4; x < 28; x += 5) {
    shape(ctx, TIMBER, [x, 26, x, 11, x + 2, 7, x + 4, 11, x + 4, 26]);
    sideShadow(ctx, x + 3, 11, 1, 15);
  }
  rect(ctx, team.color, 3, 16, 26, 3);
  rect(ctx, team.shade, 3, 19, 26, 1);
  ctx.restore();
};

/** Сигнальный костёр: каменное кольцо, дрова и высокое пламя. */
export const drawBeacon = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale = 1,
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale, team);
  ctx.fillStyle = STONE_DARK;
  ctx.beginPath();
  ctx.ellipse(16, 22, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y] of [
    [6, 22],
    [10, 25],
    [17, 26],
    [24, 23],
    [24, 19],
    [8, 18],
  ])
    circle(ctx, STONE, x, y, 2.2);
  shape(ctx, TIMBER, [7, 22, 23, 18, 25, 21, 9, 25]);
  shape(ctx, '#855335', [7, 19, 9, 17, 25, 22, 23, 25]);
  shape(
    ctx,
    '#ef773c',
    [11, 22, 8, 17, 13, 10, 15, 4, 20, 12, 23, 16, 22, 21, 17, 24],
  );
  shape(ctx, '#ffd978', [13, 22, 12, 18, 16, 12, 17, 17, 20, 19, 18, 23]);
  ctx.restore();
};
