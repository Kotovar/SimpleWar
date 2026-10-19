/**
 * Отметка своего рудника или лесопилки без рабочего: жёлтый круг с «!»
 * в правом верхнем углу клетки. Без рабочего здание ничего не приносит.
 *
 * @param x - Столбец клетки, может быть дробным во время анимации.
 * @param y - Строка клетки.
 */
export const drawIdleBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) => {
  const radius = cellSize * 0.17;
  const cx = (x + 1) * cellSize - radius * 1.15;
  const cy = y * cellSize + radius * 1.15;

  ctx.save();
  ctx.fillStyle = '#f2c14e';
  ctx.strokeStyle = 'rgba(28, 34, 30, 0.9)';
  ctx.lineWidth = Math.max(1, radius * 0.25);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1c221e';
  ctx.font = `800 ${Math.round(radius * 1.5)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + radius * 0.08);
  ctx.restore();
};
