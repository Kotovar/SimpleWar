import { TEAM_MARKERS, type Owner } from '@shared/config';
import { beginEntity, circle, rect, shape } from './drawEntity';

const SKIN = '#ecc59a';
const STEEL = '#c6d1d5';
const OUTLINE = '#292c30';

/** Ноги в сапогах: общая основа всех юнитов. */
const legs = (ctx: CanvasRenderingContext2D, color: string) => {
  rect(ctx, color, 12, 20.5, 3, 5);
  rect(ctx, color, 16.5, 20.5, 3, 5);
};

/** Туника в цвете стороны с поясом: основной признак принадлежности. */
const tunic = (ctx: CanvasRenderingContext2D, owner: Owner, belt: string) => {
  shape(ctx, TEAM_MARKERS[owner].color, [10.5, 13, 21, 13, 22.5, 22, 9, 22]);
  ctx.fillStyle = belt;
  ctx.fillRect(9.9, 18.4, 11.8, 1.8);
};

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  legs(ctx, '#3f4850');
  tunic(ctx, owner, '#6b4f33');
  // Наплечник и шлем из стали: мечник узнаётся по металлу.
  shape(ctx, STEEL, [17.5, 13, 21, 13, 22, 16.5, 18.5, 16]);
  circle(ctx, SKIN, 15.8, 9.8, 3.5);
  shape(ctx, STEEL, [11.8, 10, 12.4, 6.4, 15.8, 4.6, 19.2, 6.4, 19.8, 10]);
  ctx.fillStyle = '#8e9ba1';
  ctx.fillRect(15.1, 6, 1.4, 5.5);
  // Меч вынесен за силуэт; широкий щит узнаётся и на маленьком масштабе.
  shape(ctx, '#eef2ea', [24, 3.5, 25.6, 5.5, 25.6, 18, 22.4, 18, 22.4, 5.5]);
  rect(ctx, '#d6b265', 20.5, 17.5, 7, 2);
  rect(ctx, '#7a5634', 23.2, 19.5, 1.6, 3.5);
  shape(
    ctx,
    TEAM_MARKERS[owner].shade,
    [4, 13, 12.5, 13, 12.5, 19.5, 8.25, 24.5, 4, 19.5],
  );
  // Светлый умбон по центру щита.
  circle(ctx, '#f3eedd', 8.25, 17.5, 1.6);
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
  // Колчан за спиной выглядывает над плечом.
  shape(ctx, '#8a5a36', [6.5, 8.5, 9.5, 7.5, 11.5, 17, 8.5, 18]);
  ctx.strokeStyle = '#f3eedd';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(7.2, 8);
  ctx.lineTo(6.4, 5.5);
  ctx.moveTo(8.8, 7.6);
  ctx.lineTo(8.6, 5);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.2;
  legs(ctx, '#5a4a3a');
  tunic(ctx, owner, '#5b4430');
  circle(ctx, SKIN, 15.5, 9.9, 3.4);
  // Капюшон обрамляет лицо: силуэт лучника отличается от шлема мечника.
  shape(
    ctx,
    TEAM_MARKERS[owner].shade,
    [11.3, 12, 11.6, 7, 15.5, 4.2, 19.4, 7, 19.7, 12, 18.4, 8.6, 12.6, 8.6],
  );
  // Лук занимает всю высоту фигуры, тетива не сливается с корпусом.
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(23, 4.5);
  ctx.quadraticCurveTo(32, 14.5, 23, 24.5);
  ctx.stroke();
  ctx.strokeStyle = '#d19a55';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.strokeStyle = '#f6e9c7';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(23, 4.5);
  ctx.lineTo(21.5, 14.5);
  ctx.lineTo(23, 24.5);
  ctx.stroke();
  // Стрела на тетиве.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(18, 14.5);
  ctx.lineTo(29, 14.5);
  ctx.stroke();
  ctx.strokeStyle = '#e8dcc0';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1;
  shape(ctx, STEEL, [29, 12.8, 31.2, 14.5, 29, 16.2]);
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
  // Кирка на плече — главный признак рабочего.
  rect(ctx, '#a0703f', 22.2, 7, 2, 16);
  shape(ctx, STEEL, [17.5, 9, 23, 5.4, 28.8, 9, 23.2, 7.6]);
  legs(ctx, '#5b4a3c');
  tunic(ctx, owner, '#6b4f33');
  shape(ctx, '#caa36c', [13.6, 16.5, 17.9, 16.5, 18.4, 22, 13.1, 22]);
  circle(ctx, SKIN, 15.5, 10, 3.5);
  // Соломенная шляпа с широкими полями.
  ctx.fillStyle = '#e3c46f';
  ctx.beginPath();
  ctx.ellipse(15.5, 7.6, 6.4, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  shape(ctx, '#e8cf82', [12.4, 7.4, 13.3, 4, 17.7, 4, 18.6, 7.4]);
  ctx.fillStyle = '#b8863f';
  ctx.fillRect(12.8, 6, 5.4, 1.1);
  ctx.restore();
};
