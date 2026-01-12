import { UNIT_PALETTES, type Owner } from '@shared/config';
import { getBuildingBase } from './getBuildingBase';

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.5,
) => {
  const palette = UNIT_PALETTES[owner];
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // ноги
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.45 * unit,
    baseY + 0.6 * unit,
    0.04 * unit,
    0.18 * unit,
  );
  ctx.fillRect(
    baseX + 0.5 * unit,
    baseY + 0.6 * unit,
    0.04 * unit,
    0.18 * unit,
  );
  // тело
  ctx.fillRect(
    baseX + 0.42 * unit,
    baseY + 0.42 * unit,
    0.16 * unit,
    0.22 * unit,
  );
  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * unit,
    baseY + 0.32 * unit,
    0.12 * unit,
    0.1 * unit,
  );
  // меч — клинок
  ctx.fillStyle = palette.sword;
  ctx.fillRect(
    baseX + 0.6 * unit,
    baseY + 0.38 * unit,
    0.04 * unit,
    0.2 * unit,
  );
  // меч — рукоять
  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    baseX + 0.58 * unit,
    baseY + 0.56 * unit,
    0.08 * unit,
    0.04 * unit,
  );
};

export const drawArcher = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.5,
) => {
  const palette = UNIT_PALETTES[owner];
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // ноги
  ctx.fillStyle = palette.bodyArcher;
  ctx.fillRect(
    baseX + 0.45 * unit,
    baseY + 0.6 * unit,
    0.04 * unit,
    0.18 * unit,
  );
  ctx.fillRect(
    baseX + 0.5 * unit,
    baseY + 0.6 * unit,
    0.04 * unit,
    0.18 * unit,
  );
  // тело
  ctx.fillRect(
    baseX + 0.42 * unit,
    baseY + 0.42 * unit,
    0.16 * unit,
    0.22 * unit,
  );
  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * unit,
    baseY + 0.32 * unit,
    0.12 * unit,
    0.1 * unit,
  );
  // стрела — древко
  ctx.fillStyle = palette.arrowShaft;
  ctx.fillRect(
    baseX + 0.62 * unit,
    baseY + 0.49 * unit,
    0.2 * unit,
    0.02 * unit,
  );
  // лук — вертикальная дуга
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.61 * unit,
    baseY + 0.36 * unit,
    0.01 * unit,
    0.28 * unit,
  );
  const stringOffsetX = -0.01 * unit;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 0.01 * unit;
  ctx.beginPath();
  ctx.moveTo(baseX + 0.63 * unit + stringOffsetX, baseY + 0.36 * unit);
  ctx.quadraticCurveTo(
    baseX + 0.7 * unit + stringOffsetX,
    baseY + 0.5 * unit,
    baseX + 0.63 * unit + stringOffsetX,
    baseY + 0.64 * unit,
  );
  ctx.stroke();
  // стрела — наконечник
  ctx.fillRect(
    baseX + 0.83 * unit,
    baseY + 0.48 * unit,
    0.02 * unit,
    0.03 * unit,
  );
};

export const drawWorker = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.5,
) => {
  const palette = UNIT_PALETTES[owner];
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // ноги
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.45 * unit,
    baseY + 0.6 * unit,
    0.04 * unit,
    0.18 * unit,
  );
  ctx.fillRect(
    baseX + 0.5 * unit,
    baseY + 0.6 * unit,
    0.04 * unit,
    0.18 * unit,
  );
  // тело
  ctx.fillRect(
    baseX + 0.42 * unit,
    baseY + 0.42 * unit,
    0.16 * unit,
    0.22 * unit,
  );
  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * unit,
    baseY + 0.32 * unit,
    0.12 * unit,
    0.1 * unit,
  );
  // молот — рукоять (shaft)
  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    baseX + 0.58 * unit,
    baseY + 0.38 * unit,
    0.04 * unit,
    0.24 * unit,
  );
  // молот — головка (head)
  ctx.fillStyle = palette.sword;
  ctx.fillRect(
    baseX + 0.52 * unit,
    baseY + 0.34 * unit,
    0.16 * unit,
    0.06 * unit,
  );
};
