import { UNIT_PALETTES, type Owner } from '@shared/config';

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
) => {
  const palette = UNIT_PALETTES[owner];
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // ноги
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.45 * cellSize,
    baseY + 0.6 * cellSize,
    0.04 * cellSize,
    0.18 * cellSize,
  );
  ctx.fillRect(
    baseX + 0.5 * cellSize,
    baseY + 0.6 * cellSize,
    0.04 * cellSize,
    0.18 * cellSize,
  );

  // тело
  ctx.fillRect(
    baseX + 0.42 * cellSize,
    baseY + 0.42 * cellSize,
    0.16 * cellSize,
    0.22 * cellSize,
  );

  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * cellSize,
    baseY + 0.32 * cellSize,
    0.12 * cellSize,
    0.1 * cellSize,
  );

  // меч — клинок
  ctx.fillStyle = palette.sword;
  ctx.fillRect(
    baseX + 0.6 * cellSize,
    baseY + 0.38 * cellSize,
    0.04 * cellSize,
    0.2 * cellSize,
  );

  // меч — рукоять
  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    baseX + 0.58 * cellSize,
    baseY + 0.56 * cellSize,
    0.08 * cellSize,
    0.04 * cellSize,
  );
};

export const drawArcher = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
) => {
  const palette = UNIT_PALETTES[owner];
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // ноги
  ctx.fillStyle = palette.bodyArcher;
  ctx.fillRect(
    baseX + 0.45 * cellSize,
    baseY + 0.6 * cellSize,
    0.04 * cellSize,
    0.18 * cellSize,
  );
  ctx.fillRect(
    baseX + 0.5 * cellSize,
    baseY + 0.6 * cellSize,
    0.04 * cellSize,
    0.18 * cellSize,
  );

  // тело
  ctx.fillRect(
    baseX + 0.42 * cellSize,
    baseY + 0.42 * cellSize,
    0.16 * cellSize,
    0.22 * cellSize,
  );

  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * cellSize,
    baseY + 0.32 * cellSize,
    0.12 * cellSize,
    0.1 * cellSize,
  );

  // стрела — древко
  ctx.fillStyle = palette.arrowShaft;
  ctx.fillRect(
    baseX + 0.62 * cellSize,
    baseY + 0.49 * cellSize,
    0.2 * cellSize,
    0.02 * cellSize,
  );

  // лук — вертикальная дуга
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.61 * cellSize,
    baseY + 0.36 * cellSize,
    0.01 * cellSize,
    0.28 * cellSize,
  );

  const stringOffsetX = -0.01 * cellSize;

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 0.01 * cellSize;
  ctx.beginPath();

  ctx.moveTo(baseX + 0.63 * cellSize + stringOffsetX, baseY + 0.36 * cellSize);

  ctx.quadraticCurveTo(
    baseX + 0.7 * cellSize + stringOffsetX,
    baseY + 0.5 * cellSize,
    baseX + 0.63 * cellSize + stringOffsetX,
    baseY + 0.64 * cellSize,
  );
  ctx.stroke();

  // стрела — наконечник
  ctx.fillRect(
    baseX + 0.83 * cellSize,
    baseY + 0.48 * cellSize,
    0.02 * cellSize,
    0.03 * cellSize,
  );
};
