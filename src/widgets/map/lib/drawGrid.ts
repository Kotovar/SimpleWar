import { CANVAS_SIZE, Cell, CELL_SIZE } from '@shared/config';

const GRID_LINE_THICKNESS = 1;
const GRID_LINE_COLOR = 'rgba(0, 0, 0, 0.04)';

const GRASS_BASE = { r: 46, g: 160, b: 55 };
const WATER_BASE = { r: 40, g: 110, b: 180 };

const drawCellBackground = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  color: { r: number; g: number; b: number },
  variation: number,
) => {
  ctx.fillStyle = `rgb(
    ${color.r + variation},
    ${color.g + variation},
    ${color.b + variation}
  )`;

  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
};

export const drawBackgroundAndGrid = (
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  noise: number[][],
  grid: Cell[][],
) => {
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.type === 'water') {
        drawCellBackground(ctx, x, y, CELL_SIZE, WATER_BASE, noise[y][x]);
      } else {
        drawCellBackground(ctx, x, y, CELL_SIZE, GRASS_BASE, noise[y][x]);
      }
    }),
  );

  // сетка поверх
  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = GRID_LINE_THICKNESS;

  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const p = i * CELL_SIZE;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, CANVAS_SIZE);
    ctx.moveTo(0, p);
    ctx.lineTo(CANVAS_SIZE, p);
  }
  ctx.stroke();
};
