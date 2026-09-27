import { TEAM_MARKERS, type Owner } from '@shared/config';
import { beginEntity, circle, rect, shape } from './drawEntity';
import { OUTLINE, SKIN } from './drawFigure';

/** Мантия до пят: у магических юнитов вместо туники и сапог. */
const robe = (ctx: CanvasRenderingContext2D, color: string, trim: string) => {
  shape(ctx, color, [11, 12.5, 20.5, 12.5, 23, 25, 8.5, 25]);
  ctx.fillStyle = trim;
  ctx.fillRect(14.8, 12.5, 1.9, 12.5);
};

/** Маг: мантия стороны, остроконечная шляпа и посох со светящейся сферой. */
export const drawMage = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Посох выше силуэта со сферой — главный признак мага.
  rect(ctx, '#7a5634', 23.2, 5, 1.6, 20);
  ctx.save();
  ctx.shadowColor = '#b58cff';
  ctx.shadowBlur = 6;
  circle(ctx, '#c9a8ff', 24, 4, 2.6);
  ctx.restore();
  robe(ctx, team.color, '#e8d9a8');
  circle(ctx, SKIN, 15.7, 10.2, 3.2);
  // Остроконечная шляпа.
  shape(ctx, team.shade, [10.8, 8.6, 20.6, 8.6, 17.5, 0.8]);
  ctx.restore();
};

/** Лекарь: светлая мантия с крестом стороны и сумка с травами. */
export const drawHealer = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  robe(ctx, '#f1ede1', team.color);
  // Крест на груди в цвете стороны.
  ctx.fillStyle = team.color;
  ctx.fillRect(14.5, 15, 3, 7);
  ctx.fillRect(12.5, 17, 7, 3);
  circle(ctx, SKIN, 15.7, 9.8, 3.3);
  // Капюшон.
  shape(
    ctx,
    '#dcd5c0',
    [11.6, 11.5, 12, 7, 15.7, 4.6, 19.4, 7, 19.8, 11.5, 18.4, 8.4, 13, 8.4],
  );
  // Сумка с травами.
  rect(ctx, '#8a6238', 21, 16.5, 4.6, 4);
  shape(ctx, '#6fbf73', [22, 16.5, 23, 13.5, 24.4, 16.5]);
  ctx.restore();
};

/** Грифон: тело поднято над тенью, крылья раскрыты — видно, что он в воздухе. */
export const drawGriffon = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1,
) => {
  beginEntity(ctx, cellX, cellY, cellSize, owner, scale);
  const team = TEAM_MARKERS[owner];
  // Тень на земле отделена от тела: юнит летит.
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 14, 0.35)';
  ctx.strokeStyle = 'transparent';
  ctx.beginPath();
  ctx.ellipse(16, 24.5, 8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Крылья стороны.
  shape(ctx, team.color, [13, 11, 2, 3, 4.5, 12, 12, 15]);
  shape(ctx, team.shade, [19, 11, 30, 3, 27.5, 12, 20, 15]);
  // Тело льва и голова орла.
  shape(ctx, '#c9a36a', [10, 12, 22, 12, 23, 18, 9, 18]);
  circle(ctx, '#f3eedd', 22.5, 9.5, 3.2);
  shape(ctx, '#e8b441', [25, 9, 28.5, 10.2, 25, 11.4]);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(23.4, 8.8, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Лапы.
  rect(ctx, '#a07a48', 11, 18, 2, 3);
  rect(ctx, '#a07a48', 19, 18, 2, 3);
  ctx.restore();
};
