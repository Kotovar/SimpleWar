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
  // Согнутая рука поддерживает трубу у глаза.
  shape(ctx, team.shade, [19, 13, 21, 13, 23, 16, 20, 17, 18.5, 15]);
  shape(ctx, SKIN, [20, 15, 22, 10, 24, 10.5, 22.5, 16]);
  rect(ctx, '#a67c40', 18, 8.8, 8, 2.8);
  rect(ctx, '#e0c27f', 24.5, 8.1, 4, 4.2);
  rect(ctx, '#98dbe8', 28, 8.6, 1.5, 3.2);
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
  shape(ctx, team.color, [19, 13, 22, 13, 23.5, 16, 21, 17]);
  shape(ctx, SKIN, [21.5, 14.5, 25.5, 14.5, 25.5, 17, 22, 17]);
  circle(ctx, SKIN, 15.8, 9.8, 3.4);
  // Конический шлем.
  shape(ctx, STEEL, [11.9, 9.6, 15.8, 3.8, 19.7, 9.6]);
  // Круглый щит стороны.
  circle(ctx, team.shade, 8.8, 17, 4.6);
  circle(ctx, '#f3eedd', 8.8, 17, 1.3);
  ctx.restore();
};

/** Всадник: конь с гривой, седлом и поводьями. */
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
  // Дальние ноги и хвост позади округлого корпуса.
  shape(ctx, '#61432e', [10, 18, 13, 18, 12, 22, 10, 25, 8, 25, 10, 21]);
  shape(ctx, '#61432e', [19, 18, 21, 18, 23, 23, 25, 23, 25, 25, 21, 25]);
  shape(ctx, '#4f3622', [8, 14, 5, 15, 3.5, 21, 5, 23, 6, 18, 9, 17]);
  ctx.fillStyle = horse;
  ctx.beginPath();
  ctx.ellipse(15, 16.5, 8, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  shape(ctx, horse, [9, 18, 12, 19, 11, 23, 11, 25, 8.5, 25]);
  shape(ctx, horse, [19, 18, 22, 17, 21.5, 22, 22, 25, 19.5, 25]);
  // Высокая шея, уши и вытянутая морда.
  shape(
    ctx,
    horse,
    [
      19, 15, 21, 9, 22, 5.5, 23.5, 7.5, 25, 6, 25.5, 9, 29, 11, 28, 13, 24, 12,
      23, 18,
    ],
  );
  shape(ctx, '#4f3622', [21, 8, 23, 7.5, 22, 12, 21, 16, 19, 16]);
  circle(ctx, OUTLINE, 25, 9.8, 0.45);
  rect(ctx, '#302c28', 8.5, 24, 2.5, 1.5);
  rect(ctx, '#302c28', 19.5, 24, 2.8, 1.5);
  // Чепрак стороны.
  shape(ctx, team.color, [11, 13, 18, 13, 19, 19, 10, 19]);
  rect(ctx, '#4f3622', 11.5, 12.5, 7, 2);
  // Наездник: торс и голова в шлеме.
  shape(ctx, team.shade, [12.5, 13.5, 13.2, 7.5, 17.8, 7.5, 18.5, 13.5]);
  circle(ctx, SKIN, 15.5, 5.2, 2.8);
  shape(ctx, STEEL, [12.6, 5, 15.5, 1.6, 18.4, 5]);
  // Сапог поверх чепрака и рука на поводьях.
  shape(ctx, '#41464b', [14, 13.5, 17, 13.5, 17, 19, 19, 19, 19, 21, 14.5, 21]);
  shape(ctx, SKIN, [18, 9, 20, 11, 21, 11, 21, 13, 18, 12]);
  ctx.strokeStyle = '#e0c27f';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(27, 10.5);
  ctx.lineTo(26, 13);
  ctx.lineTo(20, 12);
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
  // Открытая треугольная рама с осью метательного рычага.
  rect(ctx, '#8a6238', 4, 17, 24, 3.4);
  shape(ctx, '#9c7446', [9, 17, 14, 9, 16, 10, 12, 17]);
  shape(ctx, '#9c7446', [15, 9, 17, 9, 23, 17, 20, 17]);
  rect(ctx, team.color, 4, 17, 24, 1.4);
  // Метательный рычаг с чашей и камнем.
  shape(ctx, '#c49a60', [11, 16, 9, 14, 24, 4.5, 25.5, 6.5]);
  circle(ctx, '#9aa5a3', 25, 4.5, 2.5);
  shape(ctx, '#8a6238', [21, 4.5, 24.5, 6, 29, 4.5, 27, 8, 23.5, 8]);
  circle(ctx, '#dbc89f', 15.5, 11.5, 1.8);
  // Натяжной канат от короткого плеча к вороту.
  ctx.strokeStyle = '#e0cba2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(11, 15);
  ctx.lineTo(8, 18);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  // Колёса.
  for (const x of [8, 24]) {
    circle(ctx, '#5b4430', x, 22, 3.4);
    circle(ctx, '#c9a36a', x, 22, 1);
  }
  ctx.restore();
};
