const BASE_WALL = '#8b8b8b';
const BASE_ROOF = '#5a5a5a';
const BASE_DOOR = '#3a3a3a';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // стены
  ctx.fillStyle = BASE_WALL;
  ctx.fillRect(
    baseX + 0.22 * cellSize,
    baseY + 0.35 * cellSize,
    0.56 * cellSize,
    0.32 * cellSize,
  );

  // дверь
  ctx.fillStyle = BASE_DOOR;
  ctx.fillRect(
    baseX + 0.46 * cellSize,
    baseY + 0.48 * cellSize,
    0.08 * cellSize,
    0.19 * cellSize,
  );

  // крыша
  ctx.fillStyle = BASE_ROOF;
  ctx.fillRect(
    baseX + 0.18 * cellSize,
    baseY + 0.28 * cellSize,
    0.64 * cellSize,
    0.1 * cellSize,
  );
};
