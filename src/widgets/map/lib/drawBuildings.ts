import { Owner } from '@shared/config';

type BuildingPalette = {
  wall: string;
  roof: string;
  door: string;
};

const PALETTES: Record<Owner, BuildingPalette> = {
  player: {
    wall: '#8b8b8b',
    roof: '#355724ff',
    door: '#2b8200ff',
  },
  enemy: {
    wall: '#8b8b8b',
    roof: '#bc1f1fff',
    door: '#ea0404ff',
  },
};

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
) => {
  const palette = PALETTES[owner];
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
