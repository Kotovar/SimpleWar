import { SELECTED } from '@shared/config';

export const drawMovement = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  type: 'free' | 'enemy' | 'produce',
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  ctx.fillStyle = SELECTED[type];
  ctx.beginPath();
  ctx.fillRect(
    baseX + SELECTED.lineThickness,
    baseY + SELECTED.lineThickness,
    cellSize - SELECTED.lineThickness,
    cellSize - SELECTED.lineThickness,
  );
  ctx.stroke();
};
