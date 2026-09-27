import { TEAM_MARKERS, type Owner } from '@shared/config';
import { beginEntity, circle, rect, shape } from './drawEntity';
import { legs, OUTLINE, SKIN, STEEL, tunic } from './drawFigure';

/** Разведчик: лёгкая шапка с пером и подзорная труба. */
export const drawScout = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  legs(ctx, '#6b5a44');
  tunic(ctx, owner, '#7a5a38');
  // Короткий плащ стороны за спиной.
  shape(ctx, team.shade, [9.5, 13, 12, 13, 11, 21, 7.5, 20]);
  circle(ctx, SKIN, 15.6, 9.8, 3.4);
  // Шапка с длинным пером — узнаётся издалека.
  shape(ctx, '#5d7447', [11.8, 8.4, 12.6, 5.6, 18.8, 5.6, 19.6, 8.4]);
  ctx.strokeStyle = '#f3eedd';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(18.6, 5.8);
  ctx.quadraticCurveTo(23, 2.5, 25.5, 4.5);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  // Подзорная труба в вытянутой руке.
  rect(ctx, '#c9a36a', 20.5, 11.2, 7.5, 2);
  rect(ctx, '#e0c27f', 26.8, 10.8, 2.4, 2.8);
  ctx.restore();
};

/** Копейщик: длинное копьё выше силуэта и круглый щит. */
export const drawSpearman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Древко с наконечником: главный признак копейщика.
  rect(ctx, '#8a6238', 23.4, 1.5, 1.6, 23);
  shape(ctx, STEEL, [24.2, -1.5, 26.2, 3.5, 24.2, 5, 22.2, 3.5]);
  legs(ctx, '#4a4a42');
  tunic(ctx, owner, '#5b4430');
  circle(ctx, SKIN, 15.8, 9.8, 3.4);
  // Конический шлем.
  shape(ctx, STEEL, [11.9, 9.6, 15.8, 3.8, 19.7, 9.6]);
  // Круглый щит стороны.
  circle(ctx, team.shade, 8.8, 17, 4.6);
  circle(ctx, '#f3eedd', 8.8, 17, 1.3);
  ctx.restore();
};

/** Всадник: конь во всю ширину клетки и наездник с копьецом. */
export const drawRider = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  const horse = '#8b6340';
  // Ноги коня.
  for (const x of [7, 10.5, 19.5, 23]) rect(ctx, '#6e4d31', x, 18.5, 2, 6.5);
  // Корпус, шея и голова.
  shape(ctx, horse, [5.5, 13.5, 25, 13.5, 26, 19.5, 6, 19.5]);
  shape(
    ctx,
    horse,
    [22, 14, 25.5, 7, 29.5, 8.5, 29.8, 11, 26.5, 11.5, 25.5, 15],
  );
  // Чепрак стороны.
  shape(ctx, team.color, [10, 13.5, 19.5, 13.5, 20.5, 19.5, 9.5, 19.5]);
  // Наездник: торс и голова в шлеме.
  shape(ctx, team.shade, [12.5, 13.5, 13.2, 7.5, 17.8, 7.5, 18.5, 13.5]);
  circle(ctx, SKIN, 15.5, 5.2, 2.8);
  shape(ctx, STEEL, [12.6, 5, 15.5, 1.6, 18.4, 5]);
  // Хвост.
  ctx.strokeStyle = '#4f3622';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(5.8, 14.5);
  ctx.quadraticCurveTo(2.5, 16, 3.5, 21);
  ctx.stroke();
  ctx.restore();
};

/** Осадная машина: катапульта на колёсах, рама цвета стороны. */
export const drawSiege = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Рама и стойки.
  rect(ctx, '#8a6238', 4, 17, 24, 3.4);
  shape(ctx, '#9c7446', [11, 17, 14, 8.5, 18, 8.5, 21, 17]);
  rect(ctx, team.color, 4, 17, 24, 1.4);
  // Метательный рычаг с чашей и камнем.
  ctx.strokeStyle = '#6e4d31';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(16, 11);
  ctx.lineTo(27, 4.5);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  circle(ctx, '#9aa5a3', 27.5, 3.8, 2.2);
  // Колёса.
  for (const x of [8, 24]) {
    circle(ctx, '#5b4430', x, 22, 3.4);
    circle(ctx, '#c9a36a', x, 22, 1);
  }
  ctx.restore();
};
