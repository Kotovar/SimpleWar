import { SELECTION } from '@shared/config';

export const drawSelectionHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  kind: 'entity' | 'cell' = 'entity',
  /** Фаза пульсации от 0 (покой) до 1 (пик): рамка «дышит» внутрь и светится. */
  pulse = 0,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.save();
  // В покое заливка как раньше, на пике пульса — ярче.
  ctx.globalAlpha *= 0.65 + pulse * 0.35;
  ctx.fillStyle = SELECTION.cellFill;
  if (kind === 'cell') {
    ctx.roundRect(2, 2, 28, 28, 4);
    ctx.fill();
    ctx.restore();
  } else {
    // Мягкая подсветка клетки под рамкой: выбранного юнита видно и в толпе.
    ctx.fillRect(0, 0, 32, 32);
    ctx.restore();
    ctx.beginPath();
    const near = 1.5 + pulse * 1.2;
    const far = 32 - near;
    for (const [x, y, dx, dy] of [
      [near, near, 1, 1],
      [far, near, -1, 1],
      [far, far, -1, -1],
      [near, far, 1, -1],
    ]) {
      ctx.moveTo(x, y + dy * 8);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 8, y);
    }
  }
  ctx.strokeStyle = SELECTION.colorShadow;
  ctx.lineWidth = kind === 'cell' ? 3 : 4;
  ctx.stroke();
  ctx.strokeStyle = SELECTION.colorOutline;
  ctx.lineWidth = kind === 'cell' ? 1.4 : 2.2;
  // Размытие тени задаётся в пикселях буфера: переводим из координат клетки.
  ctx.shadowColor = `rgba(255, 240, 196, ${0.8 * pulse})`;
  ctx.shadowBlur = ctx.getTransform().a * 5 * pulse;
  ctx.stroke();
  ctx.restore();
};

/** Лёгкая обводка клетки под курсором: ориентир до клика. */
export const drawHoverHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(1.5, 1.5, 29, 29, 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.3)';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 248, 224, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
};
