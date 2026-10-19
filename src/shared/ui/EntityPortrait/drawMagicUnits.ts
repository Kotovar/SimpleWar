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
  shape(ctx, team.shade, [19, 13, 21, 13, 23, 16, 21, 18, 18.5, 16]);
  shape(ctx, SKIN, [21.5, 14.5, 25.3, 14.5, 25.3, 17, 22, 17]);
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
  // Дальнее крыло и львиный хвост.
  shape(
    ctx,
    team.shade,
    [17, 13, 23, 5, 29, 1.5, 28, 7, 26, 6, 26, 10, 24, 9, 23, 13, 20, 16],
  );
  ctx.strokeStyle = '#c9a36a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(10, 16);
  ctx.bezierCurveTo(3, 21, 2, 15, 4, 13);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  shape(ctx, '#8b6340', [3, 14, 2, 11, 5, 12, 5, 14]);
  // Округлый львиный корпус и согнутые задние лапы.
  ctx.fillStyle = '#c9a36a';
  ctx.beginPath();
  ctx.ellipse(15, 16, 7.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  shape(ctx, '#a07a48', [10, 17, 13, 18, 11, 21, 14, 21, 14, 23, 9, 23, 9, 20]);
  // Ближнее крыло: отдельные маховые перья сохраняют зубчатый силуэт.
  shape(ctx, team.color, [16, 15, 10, 13, 6, 10, 2, 2, 7, 4, 12, 8, 15, 11]);
  shape(
    ctx,
    team.shade,
    [16, 15, 9, 15, 5, 12, 3, 7, 7, 10, 5, 5, 10, 10, 8, 5, 13, 10],
  );
  // Светлая перьевая грудь, хохолок и загнутый клюв орла.
  shape(
    ctx,
    '#e3dbc5',
    [18, 12, 20, 9, 24, 10, 23, 15, 24, 17, 21, 16, 21, 19, 18, 17],
  );
  shape(
    ctx,
    '#f3eedd',
    [19, 10, 20, 6, 19, 4, 22, 5.5, 25, 6, 26, 9, 24, 12, 21, 12],
  );
  shape(ctx, '#e8b441', [25, 8.5, 29, 10, 28, 12.5, 27, 11, 24.5, 10.5]);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(23.4, 8, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Орлиные передние лапы с когтями.
  shape(ctx, '#e8b441', [20, 17, 22, 17, 21, 20, 24, 21, 24, 22.5, 19, 21.5]);
  ctx.strokeStyle = '#f3eedd';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(22, 21);
  ctx.lineTo(22, 22.5);
  ctx.moveTo(24, 21.5);
  ctx.lineTo(24.5, 23);
  ctx.stroke();
  ctx.restore();
};
