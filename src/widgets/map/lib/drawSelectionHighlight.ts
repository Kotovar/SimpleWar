import { SELECTION } from '@shared/config';

export const drawSelectionHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  kind: 'entity' | 'cell' = 'entity',
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'cell') {
    ctx.roundRect(2, 2, 28, 28, 4);
    ctx.fillStyle = SELECTION.cellFill;
    ctx.fill();
  } else {
    for (const [x, y, dx, dy] of [
      [1.5, 1.5, 1, 1],
      [30.5, 1.5, -1, 1],
      [30.5, 30.5, -1, -1],
      [1.5, 30.5, 1, -1],
    ]) {
      ctx.moveTo(x, y + dy * 8);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 3, y);
    }
  }
  ctx.strokeStyle = SELECTION.colorShadow;
  ctx.lineWidth = kind === 'cell' ? 2.5 : 3.5;
  ctx.stroke();
  ctx.strokeStyle = SELECTION.colorOutline;
  ctx.lineWidth = kind === 'cell' ? 1 : 1.7;
  ctx.stroke();
  ctx.restore();
};
