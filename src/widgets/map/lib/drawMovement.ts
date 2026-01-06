const SELECTED_MOVEMENT = '#00ff4871';
const SELECTED_ENEMY = '#ff0000ad';
const GRID_LINE_THICKNESS = 2;

export const drawMovement = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  type: 'free' | 'enemy',
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  ctx.fillStyle = type === 'free' ? SELECTED_MOVEMENT : SELECTED_ENEMY;
  ctx.beginPath();
  ctx.fillRect(
    baseX + GRID_LINE_THICKNESS,
    baseY + GRID_LINE_THICKNESS,
    cellSize - GRID_LINE_THICKNESS,
    cellSize - GRID_LINE_THICKNESS,
  );
  ctx.stroke();
};
