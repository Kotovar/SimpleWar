import { Cell, GRID } from '@shared/config';
import { drawGroundDetails } from './drawGroundDetails';

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
    row.forEach((_, x) => {
      drawCellBackground(ctx, x, y, cellSize, GRID.colorGrass, noise[y][x]);
    }),
  );

  drawGroundDetails(ctx, grid, cellSize);

  // Единый силуэт воды убирает швы между водными клетками.
  const water = new Path2D();
  const radius = cellSize * 0.42;
  const isWater = (x: number, y: number) => grid[y]?.[x]?.type === 'water';

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      const left = x * cellSize;
      const top = y * cellSize;
      const north = isWater(x, y - 1);
      const east = isWater(x + 1, y);
      const south = isWater(x, y + 1);
      const west = isWater(x - 1, y);

      if (cell.type === 'water') {
        water.roundRect(left, top, cellSize, cellSize, [
          !north && !west ? radius : 0,
          !north && !east ? radius : 0,
          !south && !east ? radius : 0,
          !south && !west ? radius : 0,
        ]);
        return;
      }

      // Скругляем вогнутый берег только при наличии воды за обоими
      // рёбрами и по диагонали: отдельные озёра не соединяются уголками.
      const corners = [
        { dx: -1, dy: -1, wet: north && west },
        { dx: 1, dy: -1, wet: north && east },
        { dx: 1, dy: 1, wet: south && east },
        { dx: -1, dy: 1, wet: south && west },
      ];
      for (const { dx, dy, wet } of corners) {
        if (!wet || !isWater(x + dx, y + dy)) continue;
        const cx = left + (dx > 0 ? cellSize : 0);
        const cy = top + (dy > 0 ? cellSize : 0);
        water.moveTo(cx, cy);
        water.lineTo(cx - dx * radius, cy);
        water.quadraticCurveTo(cx, cy, cx, cy - dy * radius);
        water.closePath();
      }
    }),
  );

  ctx.save();
  const { r, g, b } = GRID.colorWater;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.shadowColor = '#b2c49a';
  ctx.shadowBlur = cellSize * 0.16;
  ctx.fill(water);
  ctx.restore();

  // сетка поверх
  ctx.strokeStyle = GRID.lineColor;
  ctx.lineWidth = GRID.lineThickness;

  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const p = i * cellSize;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, ctx.canvas.height);
    ctx.moveTo(0, p);
    ctx.lineTo(ctx.canvas.width, p);
  }
  ctx.stroke();
};
