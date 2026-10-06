/** Кадр песочных часов: доля пересыпанного песка и ход переворота. */
export type HourglassState = {
  /** Доля песка в нижней колбе, 0…1. */
  sand: number;
  /** Переворот в начале хода, 0…1: поворот, затем растворение. */
  flip: number;
};

/** Полувысота и полуширина колбы в единицах клетки 32 × 32. */
const H = 4.2;
const W = 3;
const NECK = 0.55;

const traceGlass = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(-W, -H);
  ctx.lineTo(W, -H);
  ctx.quadraticCurveTo(W, -H * 0.35, NECK, 0);
  ctx.quadraticCurveTo(W, H * 0.35, W, H);
  ctx.lineTo(-W, H);
  ctx.quadraticCurveTo(-W, H * 0.35, -NECK, 0);
  ctx.quadraticCurveTo(-W, -H * 0.35, -W, -H);
  ctx.closePath();
};

/** Полная высота часов с крышками, в тех же единицах. */
const TOTAL = (H + 1.1) * 2;

/**
 * Песочные часы в правом верхнем углу клетки, там же и того же размера,
 * что сон и приказ: своя сущность потратила действия этого хода. Модель
 * не перекрывается и не гаснет.
 *
 * @param x - Столбец клетки, может быть дробным во время анимации.
 * @param y - Строка клетки.
 * @param state - Кадр анимации, см. {@link HourglassState}.
 * @param shifted - Угол занят значком сна или приказа: часы встают левее.
 */
export const drawHourglass = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  { sand, flip }: HourglassState,
  shifted = false,
) => {
  // Первые 60% переворота — поворот, остальное — растворение.
  const turn = Math.min(1, flip / 0.6);
  const fade = flip > 0.6 ? 1 - (flip - 0.6) / 0.4 : 1;
  // Размер и угол — как у drawRestBadge.
  const size = Math.max(8, cellSize * 0.3);
  const scale = size / TOTAL;

  ctx.save();
  ctx.globalAlpha *= fade;
  ctx.translate(
    (x + 1) * cellSize - size * (shifted ? 1.5 : 0.5),
    y * cellSize + cellSize * 0.1 + size / 2,
  );
  ctx.scale(scale, scale);
  ctx.rotate(turn * Math.PI);

  ctx.lineJoin = 'round';
  traceGlass(ctx);
  ctx.fillStyle = 'rgba(214, 232, 245, 0.85)';
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#e0a83c';
  // Верхняя колба сужается к горлышку: уровень падает как корень остатка.
  const top = H * Math.sqrt(1 - sand);
  if (top > 0) ctx.fillRect(-W, -top, W * 2, top);
  const bottom = H * (1 - Math.sqrt(1 - sand));
  if (bottom > 0) ctx.fillRect(-W, H - bottom, W * 2, bottom);
  if (sand > 0 && sand < 1) {
    ctx.fillRect(-0.3, 0, 0.6, H - bottom);
  }
  ctx.restore();

  traceGlass(ctx);
  ctx.strokeStyle = '#1c2420';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Деревянные крышки.
  ctx.fillStyle = '#8a5a2b';
  ctx.strokeStyle = '#1c2420';
  ctx.lineWidth = 0.7;
  for (const cap of [-H - 1.1, H - 0.1]) {
    ctx.beginPath();
    ctx.roundRect(-W - 0.9, cap, W * 2 + 1.8, 1.2, 0.4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};
