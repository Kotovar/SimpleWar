import { SELECTED, type Position } from '@shared/config';

/** Маршрут и его цена в очках движения, как их отдаёт `getPath`. */
export type MovePath = { path: Position[]; cost: number };

/**
 * Рисует маршрут до клетки под курсором и цену хода в конце пути.
 *
 * @param route - Клетки маршрута от текущей позиции до цели и цена.
 */
export const drawPath = (
  ctx: CanvasRenderingContext2D,
  { path, cost }: MovePath,
  cellSize: number,
) => {
  if (path.length < 2) return;

  const scale = cellSize / 32;
  const center = ({ x, y }: Position) => [
    (x + 0.5) * cellSize,
    (y + 0.5) * cellSize,
  ];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((cell, index) => {
    const [x, y] = center(cell);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.5)';
  ctx.lineWidth = 4 * scale;
  ctx.stroke();
  ctx.strokeStyle = SELECTED.freeOutline;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([4 * scale, 4 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Столько очков движения спишется: холм и болото стоят дороже поля.
  const [endX, endY] = center(path[path.length - 1]);
  const text = String(cost);
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = Math.max(ctx.measureText(text).width + 8 * scale, 14 * scale);
  const height = 13 * scale;
  ctx.beginPath();
  ctx.roundRect(endX - width / 2, endY - height / 2, width, height, 6 * scale);
  ctx.fillStyle = 'rgba(24, 29, 35, 0.85)';
  ctx.fill();
  ctx.strokeStyle = SELECTED.freeOutline;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.fillStyle = '#e8edf2';
  ctx.fillText(text, endX, endY + 0.5 * scale);
  ctx.restore();
};

/**
 * Рисует границу дальности атаки: ромб по манхэттенскому расстоянию.
 *
 * Именно контур, а не заливка клеток: подсветка движения под ним остаётся видимой.
 */
export const drawAttackRange = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  range: number,
  cellSize: number,
) => {
  if (range <= 0) return;

  const scale = cellSize / 32;
  const centerX = (cellX + 0.5) * cellSize;
  const centerY = (cellY + 0.5) * cellSize;
  const reach = (range + 0.5) * cellSize;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - reach);
  ctx.lineTo(centerX + reach, centerY);
  ctx.lineTo(centerX, centerY + reach);
  ctx.lineTo(centerX - reach, centerY);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.4)';
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  ctx.strokeStyle = SELECTED.enemyOutline;
  ctx.lineWidth = 1.4 * scale;
  ctx.setLineDash([5 * scale, 4 * scale]);
  ctx.stroke();
  ctx.restore();
};
