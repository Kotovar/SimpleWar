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
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize * 0.49);
  glow.addColorStop(0, 'rgba(220, 66, 40, 0.06)');
  glow.addColorStop(0.7, 'rgba(220, 66, 40, 0.24)');
  glow.addColorStop(1, 'rgba(220, 66, 40, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, cellSize * 0.49, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  // Четыре дуги оставляют просветы вокруг меток направления.
  for (let quarter = 0; quarter < 4; quarter++) {
    const angle = (quarter * Math.PI) / 2;
    ctx.moveTo(
      cx + Math.cos(angle + 0.22) * r,
      cy + Math.sin(angle + 0.22) * r,
    );
    ctx.arc(cx, cy, r, angle + 0.22, angle + Math.PI / 2 - 0.22);
  }
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    ctx.moveTo(cx + dx * r * 0.7, cy + dy * r * 0.7);
    ctx.lineTo(cx + dx * r * 1.15, cy + dy * r * 1.15);
  }
  ctx.strokeStyle = 'rgba(40, 10, 8, 0.85)';
  ctx.lineWidth = Math.max(2, cellSize * 0.09);
  ctx.stroke();
  ctx.strokeStyle = '#ff8b70';
  ctx.lineWidth = Math.max(1, cellSize * 0.04);
  ctx.stroke();
  ctx.fillStyle = '#ffd0a3';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, cellSize * 0.035), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
