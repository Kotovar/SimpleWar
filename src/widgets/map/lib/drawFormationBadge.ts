/**
 * Значок Строя: небольшой щит в левом верхнем углу клетки копейщика, пока
 * он получает прибавку к броне. Правый край занят очками действий.
 *
 * @param cellX - Столбец клетки, может быть дробным во время анимации.
 * @param cellY - Строка клетки.
 */
export const drawFormationBadge = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.beginPath();
  ctx.moveTo(1.5, 1.5);
  ctx.lineTo(9.5, 1.5);
  ctx.lineTo(9.5, 6);
  ctx.quadraticCurveTo(9.5, 9.5, 5.5, 11);
  ctx.quadraticCurveTo(1.5, 9.5, 1.5, 6);
  ctx.closePath();
  ctx.fillStyle = '#9fc4e8';
  ctx.strokeStyle = 'rgba(28, 34, 30, 0.9)';
  ctx.lineWidth = 0.9;
  ctx.fill();
  ctx.stroke();
  // «+»: прибавка к броне.
  ctx.strokeStyle = '#1c2420';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(5.5, 3.6);
  ctx.lineTo(5.5, 8);
  ctx.moveTo(3.3, 5.8);
  ctx.lineTo(7.7, 5.8);
  ctx.stroke();
  ctx.restore();
};
