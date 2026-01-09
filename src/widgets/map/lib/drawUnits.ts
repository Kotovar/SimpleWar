import { UNIT_PALETTES, type Owner } from '@shared/config';

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.5,
) => {
  const palette = UNIT_PALETTES[owner];
  const baseX = cellX * cellSize + (cellSize * (1 - scale)) / 2;
  const baseY = cellY * cellSize + (cellSize * (1 - scale)) / 2;

  // ноги
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.45 * cellSize * scale,
    baseY + 0.6 * cellSize * scale,
    0.04 * cellSize * scale,
    0.18 * cellSize * scale,
  );
  ctx.fillRect(
    baseX + 0.5 * cellSize * scale,
    baseY + 0.6 * cellSize * scale,
    0.04 * cellSize * scale,
    0.18 * cellSize * scale,
  );
  // тело
  ctx.fillRect(
    baseX + 0.42 * cellSize * scale,
    baseY + 0.42 * cellSize * scale,
    0.16 * cellSize * scale,
    0.22 * cellSize * scale,
  );
  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * cellSize * scale,
    baseY + 0.32 * cellSize * scale,
    0.12 * cellSize * scale,
    0.1 * cellSize * scale,
  );
  // меч — клинок
  ctx.fillStyle = palette.sword;
  ctx.fillRect(
    baseX + 0.6 * cellSize * scale,
    baseY + 0.38 * cellSize * scale,
    0.04 * cellSize * scale,
    0.2 * cellSize * scale,
  );
  // меч — рукоять
  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    baseX + 0.58 * cellSize * scale,
    baseY + 0.56 * cellSize * scale,
    0.08 * cellSize * scale,
    0.04 * cellSize * scale,
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
  const baseX = cellX * cellSize + (cellSize * (1 - scale)) / 2;
  const baseY = cellY * cellSize + (cellSize * (1 - scale)) / 2;
  // ноги
  ctx.fillStyle = palette.bodyArcher;
  ctx.fillRect(
    baseX + 0.45 * cellSize * scale,
    baseY + 0.6 * cellSize * scale,
    0.04 * cellSize * scale,
    0.18 * cellSize * scale,
  );
  ctx.fillRect(
    baseX + 0.5 * cellSize * scale,
    baseY + 0.6 * cellSize * scale,
    0.04 * cellSize * scale,
    0.18 * cellSize * scale,
  );
  // тело
  ctx.fillRect(
    baseX + 0.42 * cellSize * scale,
    baseY + 0.42 * cellSize * scale,
    0.16 * cellSize * scale,
    0.22 * cellSize * scale,
  );
  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * cellSize * scale,
    baseY + 0.32 * cellSize * scale,
    0.12 * cellSize * scale,
    0.1 * cellSize * scale,
  );
  // стрела — древко
  ctx.fillStyle = palette.arrowShaft;
  ctx.fillRect(
    baseX + 0.62 * cellSize * scale,
    baseY + 0.49 * cellSize * scale,
    0.2 * cellSize * scale,
    0.02 * cellSize * scale,
  );
  // лук — вертикальная дуга
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.61 * cellSize * scale,
    baseY + 0.36 * cellSize * scale,
    0.01 * cellSize * scale,
    0.28 * cellSize * scale,
  );
  const stringOffsetX = -0.01 * cellSize * scale;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 0.01 * cellSize * scale;
  ctx.beginPath();
  ctx.moveTo(
    baseX + 0.63 * cellSize * scale + stringOffsetX,
    baseY + 0.36 * cellSize * scale,
  );
  ctx.quadraticCurveTo(
    baseX + 0.7 * cellSize * scale + stringOffsetX,
    baseY + 0.5 * cellSize * scale,
    baseX + 0.63 * cellSize * scale + stringOffsetX,
    baseY + 0.64 * cellSize * scale,
  );
  ctx.stroke();
  // стрела — наконечник
  ctx.fillRect(
    baseX + 0.83 * cellSize * scale,
    baseY + 0.48 * cellSize * scale,
    0.02 * cellSize * scale,
    0.03 * cellSize * scale,
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
  const baseX = cellX * cellSize + (cellSize * (1 - scale)) / 2;
  const baseY = cellY * cellSize + (cellSize * (1 - scale)) / 2;
  // ноги
  ctx.fillStyle = palette.body;
  ctx.fillRect(
    baseX + 0.45 * cellSize * scale,
    baseY + 0.6 * cellSize * scale,
    0.04 * cellSize * scale,
    0.18 * cellSize * scale,
  );
  ctx.fillRect(
    baseX + 0.5 * cellSize * scale,
    baseY + 0.6 * cellSize * scale,
    0.04 * cellSize * scale,
    0.18 * cellSize * scale,
  );
  // тело
  ctx.fillRect(
    baseX + 0.42 * cellSize * scale,
    baseY + 0.42 * cellSize * scale,
    0.16 * cellSize * scale,
    0.22 * cellSize * scale,
  );
  // голова
  ctx.fillStyle = palette.head;
  ctx.fillRect(
    baseX + 0.44 * cellSize * scale,
    baseY + 0.32 * cellSize * scale,
    0.12 * cellSize * scale,
    0.1 * cellSize * scale,
  );
  // молот — рукоять (shaft)
  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    baseX + 0.58 * cellSize * scale,
    baseY + 0.38 * cellSize * scale,
    0.04 * cellSize * scale,
    0.24 * cellSize * scale,
  );
  // молот — головка (head)
  ctx.fillStyle = palette.sword;
  ctx.fillRect(
    baseX + 0.52 * cellSize * scale,
    baseY + 0.34 * cellSize * scale,
    0.16 * cellSize * scale,
    0.06 * cellSize * scale,
  );
};
