/**
 * Отметка рабочего, назначенного на добычу: маленькая кирка в левом
 * верхнем углу клетки. Видна только владельцу, как и очки действий.
 *
 * @param x - Столбец клетки, может быть дробным во время анимации.
 * @param y - Строка клетки.
 */
export const drawWorkBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) => {
  const radius = cellSize * 0.16;
  const cx = x * cellSize + radius * 1.2;
  const cy = y * cellSize + radius * 1.2;

  ctx.save();
  ctx.fillStyle = 'rgba(28, 34, 30, 0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Кирка: рукоять и изогнутое остриё.
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, radius * 0.28);
  ctx.strokeStyle = '#c9a36a';
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.45, cy + radius * 0.5);
  ctx.lineTo(cx + radius * 0.3, cy - radius * 0.25);
  ctx.stroke();
  ctx.strokeStyle = '#f2d98f';
  ctx.beginPath();
  ctx.arc(
    cx + radius * 0.3,
    cy + radius * 0.35,
    radius * 0.7,
    -Math.PI * 0.95,
    -Math.PI * 0.2,
  );
  ctx.stroke();
  ctx.restore();
};
