/**
 * Отметка своего рудника или лесопилки, где внутри работает рабочий:
 * зелёный кружок с силуэтом человека в правом верхнем углу клетки — на
 * том же месте, где у простаивающего здания жёлтый «!».
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
  const radius = cellSize * 0.17;
  const cx = (x + 1) * cellSize - radius * 1.15;
  const cy = y * cellSize + radius * 1.15;

  ctx.save();
  ctx.fillStyle = '#6fbf73';
  ctx.strokeStyle = 'rgba(28, 34, 30, 0.9)';
  ctx.lineWidth = Math.max(1, radius * 0.25);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Силуэт рабочего: голова и плечи.
  ctx.fillStyle = '#1c221e';
  ctx.beginPath();
  ctx.arc(cx, cy - radius * 0.28, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy + radius * 0.5,
    radius * 0.55,
    radius * 0.35,
    0,
    Math.PI,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
};
