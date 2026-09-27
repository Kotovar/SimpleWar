/**
 * Публичная отметка подготовленного удара осады: красный прицел на клетке.
 * Рисуется поверх тумана — её видят все участники; об орудии не говорит.
 *
 * @param x - Столбец клетки удара.
 * @param y - Строка клетки удара.
 */
export const drawStrikeMark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) => {
  const cx = (x + 0.5) * cellSize;
  const cy = (y + 0.5) * cellSize;
  const r = cellSize * 0.36;

  ctx.save();
  ctx.fillStyle = 'rgba(200, 52, 40, 0.22)';
  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  ctx.lineWidth = Math.max(1.5, cellSize * 0.07);
  ctx.strokeStyle = 'rgba(40, 10, 8, 0.8)';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ff6b55';
  ctx.lineWidth = Math.max(1, cellSize * 0.045);
  ctx.setLineDash([cellSize * 0.12, cellSize * 0.08]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Перекрестие.
  ctx.beginPath();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    ctx.moveTo(cx + dx * r * 0.45, cy + dy * r * 0.45);
    ctx.lineTo(cx + dx * r * 1.25, cy + dy * r * 1.25);
  }
  ctx.stroke();
  ctx.fillStyle = '#ff6b55';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.5, cellSize * 0.05), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
