import { SELECTION } from '@shared/config';

export const drawSelectionHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  ctx.strokeStyle = SELECTION.colorOutline;
  ctx.beginPath();
  ctx.arc(
    baseX + cellSize / 2,
    baseY + cellSize / 2,
    cellSize / 2.1,
    0,
    2 * Math.PI,
  );
  ctx.stroke();
};
