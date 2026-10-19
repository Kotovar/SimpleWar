import {
  DETAIL_LEVEL,
  TEAM_MARKERS,
  type Owner,
  type Unit,
} from '@shared/config';
import { traceOwnerMarker } from '@shared/ui';

/** Уровень детализации объектов на карте. */
export type DetailLevel = 'icon' | 'silhouette' | 'detail';

/**
 * Выбирает детализацию по масштабу: вблизи — рисунок со всеми значками,
 * на среднем — рисунок и HP, издалека — значок роли и владельца.
 *
 * @param cellSize - Размер клетки в CSS-пикселях.
 */
export const getDetailLevel = (cellSize: number): DetailLevel => {
  if (cellSize < DETAIL_LEVEL.icon) return 'icon';
  if (cellSize < DETAIL_LEVEL.detail) return 'silhouette';
  return 'detail';
};

/** Сон (Z) или пропуск (Ⅱ): золотые штрихи с обводкой, без фоновой плашки. */
export const drawRestBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  mode: Unit['restMode'],
) => {
  if (!mode) return;
  const size = Math.max(8, cellSize * 0.3);
  const left = (x + 1) * cellSize - size;
  const top = y * cellSize + cellSize * 0.1;
  ctx.save();
  ctx.translate(left, top);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (mode === 'sleep') {
    ctx.moveTo(size * 0.15, size * 0.2);
    ctx.lineTo(size * 0.85, size * 0.2);
    ctx.lineTo(size * 0.15, size * 0.8);
    ctx.lineTo(size * 0.85, size * 0.8);
  } else {
    for (const x of [0.3, 0.7]) {
      ctx.moveTo(size * x, size * 0.2);
      ctx.lineTo(size * x, size * 0.8);
    }
  }
  ctx.strokeStyle = '#202b35';
  ctx.lineWidth = Math.max(2, size * 0.25);
  ctx.stroke();
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = Math.max(1.4, size * 0.14);
  ctx.stroke();
  ctx.restore();
};

/**
 * Приказ «Идти в точку» в том же углу, что сон и пропуск: `»` — в пути,
 * красный `!` — остановлен и ждёт решения.
 */
export const drawOrderBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  order: Unit['order'],
) => {
  if (!order) return;
  const size = Math.max(8, cellSize * 0.3);
  ctx.save();
  ctx.font = `bold ${Math.round(size * 1.1)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const left = (x + 1) * cellSize - size / 2;
  const top = y * cellSize + cellSize * 0.1 + size / 2;
  const text = order.stopped ? '!' : order.type === 'explore' ? '⌖' : '»';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#202b35';
  ctx.lineWidth = Math.max(2, size * 0.25);
  ctx.strokeText(text, left, top);
  ctx.fillStyle = order.stopped ? '#ff6b5b' : '#f2c14e';
  ctx.fillText(text, left, top);
  ctx.restore();
};

/**
 * Значок дальнего масштаба. Роль — по подложке: здание на квадратной
 * плашке, военный — крупная фигура, рабочий — мелкая. Владелец — по цвету
 * и форме маркера, поэтому различим и в монохроме.
 *
 * @param role - Роль объекта.
 * @param x - Столбец клетки, может быть дробным во время анимации.
 * @param y - Строка клетки.
 */
export const drawRoleIcon = (
  ctx: CanvasRenderingContext2D,
  role: 'building' | 'military' | 'civil',
  x: number,
  y: number,
  cellSize: number,
  owner: Owner,
) => {
  const team = TEAM_MARKERS[owner];
  const cx = (x + 0.5) * cellSize;
  const cy = (y + 0.5) * cellSize;
  ctx.save();
  ctx.lineWidth = Math.max(1, cellSize * 0.08);
  ctx.strokeStyle = '#11161c';

  if (role === 'building') {
    ctx.fillStyle = team.background;
    ctx.beginPath();
    ctx.roundRect(
      x * cellSize + cellSize * 0.06,
      y * cellSize + cellSize * 0.06,
      cellSize * 0.88,
      cellSize * 0.88,
      cellSize * 0.12,
    );
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = team.color;
  const radius = cellSize * (role === 'civil' ? 0.22 : 0.32);
  traceOwnerMarker(ctx, team.marker, cx, cy, radius);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/**
 * Повреждённое здание: трещины по фасаду и дым над крышей. Статус читается
 * формой, без опоры на цвет полосы HP.
 *
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 */
export const drawDamagedBuilding = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);

  ctx.fillStyle = 'rgba(60, 60, 64, 0.7)';
  for (const [cx, cy, r] of [
    [21, 6, 2.6],
    [23.5, 3.2, 2],
    [25.5, 0.8, 1.5],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1c1f22';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(10, 13);
  ctx.lineTo(12, 16.5);
  ctx.lineTo(10.5, 19);
  ctx.lineTo(12.5, 22);
  ctx.moveTo(21, 15);
  ctx.lineTo(19.5, 18);
  ctx.lineTo(21.5, 20.5);
  ctx.stroke();
  ctx.restore();
};
