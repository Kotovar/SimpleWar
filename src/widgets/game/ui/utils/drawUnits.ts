const UNIT_BODY = '#4a4a4a';
const UNIT_HEAD = '#d2b48c';
const UNIT_SWORD = '#cfcfcf';
const UNIT_SWORD_HILT = '#6b4a2b';

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // ноги
  ctx.fillStyle = UNIT_BODY;
  ctx.fillRect(
    baseX + 0.45 * cellSize,
    baseY + 0.6 * cellSize,
    0.05 * cellSize,
    0.18 * cellSize,
  );
  ctx.fillRect(
    baseX + 0.5 * cellSize,
    baseY + 0.6 * cellSize,
    0.05 * cellSize,
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
  ctx.fillStyle = UNIT_HEAD;
  ctx.fillRect(
    baseX + 0.44 * cellSize,
    baseY + 0.32 * cellSize,
    0.12 * cellSize,
    0.1 * cellSize,
  );

  // меч — клинок
  ctx.fillStyle = UNIT_SWORD;
  ctx.fillRect(
    baseX + 0.6 * cellSize,
    baseY + 0.38 * cellSize,
    0.04 * cellSize,
    0.2 * cellSize,
  );

  // меч — рукоять
  ctx.fillStyle = UNIT_SWORD_HILT;
  ctx.fillRect(
    baseX + 0.58 * cellSize,
    baseY + 0.56 * cellSize,
    0.08 * cellSize,
    0.04 * cellSize,
  );
};
