const UNIT_BODY_SWORDSMAN = '#2a1e12ff';
const UNIT_HEAD = '#d2b48c';
const UNIT_SWORD = '#cfcfcf';
const UNIT_SWORD_HILT = '#6b4a2b';

const UNIT_BOW_LIMB = '#8B4513';
const UNIT_BOW_STRING = '#2F2F2F';
const UNIT_ARROW_SHAFT = '#DEB887';

const UNIT_BODY_ARCHER = '#e3dd23ff';

export const drawSwordsman = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // ноги
  ctx.fillStyle = UNIT_BODY_SWORDSMAN;
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

export const drawArcher = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
) => {
  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  // ноги
  ctx.fillStyle = UNIT_BODY_ARCHER;
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
  ctx.fillStyle = UNIT_HEAD;
  ctx.fillRect(
    baseX + 0.44 * cellSize,
    baseY + 0.32 * cellSize,
    0.12 * cellSize,
    0.1 * cellSize,
  );

  // стрела — древко
  ctx.fillStyle = UNIT_ARROW_SHAFT;
  ctx.fillRect(
    baseX + 0.62 * cellSize,
    baseY + 0.49 * cellSize,
    0.2 * cellSize,
    0.02 * cellSize,
  );

  // лук — вертикальная дуга (условно)
  ctx.fillStyle = UNIT_BOW_LIMB;
  ctx.fillRect(
    baseX + 0.59 * cellSize,
    baseY + 0.36 * cellSize,
    0.01 * cellSize,
    0.28 * cellSize,
  );

  const stringOffsetX = -0.03 * cellSize;

  ctx.strokeStyle = UNIT_BOW_STRING;
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

  // // тетива
  // ctx.fillStyle = UNIT_BOW_STRING;
  // ctx.fillRect(
  //   baseX + 0.6 * cellSize,
  //   baseY + 0.36 * cellSize,
  //   0.005 * cellSize,
  //   0.28 * cellSize,
  // );

  // стрела — наконечник
  ctx.fillRect(
    baseX + 0.83 * cellSize,
    baseY + 0.48 * cellSize,
    0.02 * cellSize,
    0.03 * cellSize,
  );
};
