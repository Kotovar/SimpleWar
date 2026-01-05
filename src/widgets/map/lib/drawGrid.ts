const GRASS_COLOR = 'rgba(31, 171, 42, 1)';
const GRID_LINE_COLOR = '#ccc';
const GRID_LINE_THICKNESS = 1;

export const drawBackgroundAndGrid = (
  ctx: CanvasRenderingContext2D,
  size: number,
  cellSize: number,
  gridSize: number,
) => {
  ctx.fillStyle = GRASS_COLOR;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = GRID_LINE_THICKNESS;

  // Вертикальные линии
  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const x = i * cellSize;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
  }
  ctx.stroke();

  // Горизонтальные линии
  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const y = i * cellSize;
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
  }
  ctx.stroke();
};
