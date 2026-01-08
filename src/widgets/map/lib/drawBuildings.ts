import { Owner, BUILDINGS_PALETTES } from '@shared/config';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
) => {
  const palette = BUILDINGS_PALETTES[owner];
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // стены
  ctx.fillStyle = palette.wall;
  ctx.fillRect(
    baseX + 0.22 * cellSize,
    baseY + 0.35 * cellSize,
    0.56 * cellSize,
    0.32 * cellSize,
  );

  // дверь
  ctx.fillStyle = palette.door;
  ctx.fillRect(
    baseX + 0.46 * cellSize,
    baseY + 0.48 * cellSize,
    0.08 * cellSize,
    0.19 * cellSize,
  );

  // крыша
  ctx.fillStyle = palette.roof;
  ctx.fillRect(
    baseX + 0.18 * cellSize,
    baseY + 0.28 * cellSize,
    0.64 * cellSize,
    0.1 * cellSize,
  );
};
