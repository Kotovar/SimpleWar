import { Cell, GRID } from '@shared/config';
import { useSettingsStore } from '@entities/settings';

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
  cellSize: number,
) => {
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      drawCellBackground(
        ctx,
        x,
        y,
        cellSize,
        cell.type === 'water' ? GRID.colorWater : GRID.colorGrass,
        noise[y][x],
      );
    }),
  );

  // сетка поверх
  ctx.strokeStyle = GRID.lineColor;
  ctx.lineWidth = GRID.lineThickness;

  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const p = i * cellSize;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, useSettingsStore.getState().canvasWidth);
    ctx.moveTo(0, p);
    ctx.lineTo(useSettingsStore.getState().canvasHeight, p);
  }
  ctx.stroke();
};
