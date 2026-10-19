import { TEAM_MARKERS, type Owner, type TeamStyle } from '@shared/config';

/** Доля вырубки на удары топором; остальное — падение деревьев. */
export const CHOP_PART = 0.6;
/** Сколько ударов топором до падения. */
export const CHOPS = 3;

/** Основание ствола в единицах клетки 32 × 32: ось падения. */
const BASE_X = 16;
const BASE_Y = 27;

/**
 * Одиночное дерево: ствол с зарубкой со стороны рабочего и крона.
 * Рисуется от основания ствола вверх; `notch` — глубина зарубки 0…1.
 */
const drawTree = (
  ctx: CanvasRenderingContext2D,
  notch: number,
  side: number,
) => {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = '#1c2420';
  ctx.fillStyle = '#7a5532';
  ctx.beginPath();
  ctx.rect(-1.7, -11, 3.4, 11);
  ctx.fill();
  ctx.stroke();
  if (notch > 0) {
    // Зарубка со стороны рабочего: светлая древесина в треугольном вырезе.
    ctx.fillStyle = '#e2c28c';
    ctx.beginPath();
    ctx.moveTo(-side * 1.7, -3.6);
    ctx.lineTo(-side * (1.7 - notch * 2.2), -2.6);
    ctx.lineTo(-side * 1.7, -1.6);
    ctx.closePath();
    ctx.fill();
  }
  for (const [cx, cy, r, color] of [
    [-4, -12, 5, '#2f6a3e'],
    [4, -12, 5, '#2f6a3e'],
    [0, -16, 6.5, '#3f8a4a'],
    [-1.5, -18, 3, '#5aa45c'],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
};

const drawStump = (ctx: CanvasRenderingContext2D) => {
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = '#1c2420';
  ctx.fillStyle = '#7a5532';
  ctx.beginPath();
  ctx.rect(BASE_X - 1.7, BASE_Y - 2.4, 3.4, 2.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e2c28c';
  ctx.beginPath();
  ctx.ellipse(BASE_X, BASE_Y - 2.4, 1.7, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

/** Щепки от удара: летят от зарубки в сторону рабочего и вниз. */
const drawChips = (
  ctx: CanvasRenderingContext2D,
  t: number,
  side: number,
  seed: number,
) => {
  ctx.globalAlpha = 1 - t;
  for (let i = 0; i < 6; i++) {
    const spread = 0.35 + ((i * 0.23 + seed * 0.37) % 0.9);
    const vx = -side * (3 + spread * 7);
    const vy = -4 - (i % 3) * 2;
    ctx.fillStyle = i % 2 ? '#e2c28c' : '#b58a54';
    ctx.fillRect(
      BASE_X - side * 1.7 + vx * t,
      BASE_Y - 2.6 + vy * t + 9 * t * t,
      1.6,
      0.9,
    );
  }
  ctx.globalAlpha = 1;
};

/**
 * Вырубка поверх уже расчищенной клетки. Пока рабочий трижды рубит (удар —
 * в пике его выпада), дерево вздрагивает, зарубка растёт, летят щепки.
 * Затем дерево падает от рабочего — с ускорением, с отскоком о землю,
 * пылью и листьями, — лежащий ствол растворяется, остаётся пень.
 *
 * @param fall - Куда падает дерево: от рабочего вправо (`1`) или влево.
 */
export const drawClearing = (
  ctx: CanvasRenderingContext2D,
  progress: number,
  cellSize: number,
  fall: 1 | -1 = 1,
) => {
  ctx.save();
  ctx.scale(cellSize / 32, cellSize / 32);
  const tree = (angle: number, notch: number, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(BASE_X, BASE_Y);
    ctx.rotate(angle);
    drawTree(ctx, notch, fall);
    ctx.restore();
  };

  if (progress < CHOP_PART) {
    const local = (progress / CHOP_PART) * CHOPS;
    // Удар — на середине каждого замаха.
    const sinceHit = (local % 1) - 0.5;
    const hits = Math.floor(local) + (sinceHit >= 0 ? 1 : 0);
    const shake =
      sinceHit >= 0 ? Math.sin(sinceHit * Math.PI * 6) * (1 - sinceHit * 2) : 0;
    tree(shake * 0.05 * fall, hits / CHOPS);
    if (sinceHit >= 0) drawChips(ctx, sinceHit * 2, fall, Math.floor(local));
    ctx.restore();
    return;
  }

  const q = (progress - CHOP_PART) / (1 - CHOP_PART);
  const IMPACT = 0.5;
  drawStump(ctx);
  if (q < IMPACT) {
    // Падение под собственным весом: угол растёт с ускорением.
    const t = q / IMPACT;
    tree(fall * (Math.PI / 2) * t * t, 1);
    ctx.restore();
    return;
  }
  const after = (q - IMPACT) / (1 - IMPACT);
  // Отскок о землю и растворение лежащего ствола.
  const bounce = Math.sin(Math.min(1, after * 2.5) * Math.PI) * 0.12;
  tree(fall * (Math.PI / 2 - bounce), 1, Math.max(0, 1 - after * 1.3));

  // Пыль в месте удара кроны и разлетающиеся листья.
  const landX = BASE_X + fall * 17;
  ctx.fillStyle = 'rgba(214, 196, 160, 0.85)';
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = (1 - after) * 0.8;
    ctx.beginPath();
    ctx.arc(
      landX - fall * (i * 2.5) + Math.sin(i * 2.1) * 2,
      BASE_Y - 1 - after * (2 + (i % 3) * 1.5),
      (1.6 + (i % 3) * 0.6) * (0.6 + after * 1.2),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    const angle = -Math.PI * (0.1 + (i / 7) * 0.8);
    const distance = 3 + after * (6 + (i % 3) * 2);
    ctx.globalAlpha = 1 - after;
    ctx.fillStyle = i % 2 ? '#5aa45c' : '#3f8a4a';
    ctx.fillRect(
      landX - fall * 6 + Math.cos(angle) * distance,
      BASE_Y - 4 + Math.sin(angle) * distance + after * after * 6,
      1.4,
      1,
    );
  }
  ctx.restore();
};

/**
 * Рисует появление юнита или здания под моделью и поверх неё.
 *
 * Под моделью (`under`) от края постамента расходится кольцо цвета стороны
 * и разлетается пыль; поверх модели (`over`) поднимаются искры.
 *
 * @param ctx - Контекст холста.
 * @param owner - Сторона, определяющая цвет эффекта.
 * @param progress - Доля прошедшего времени от 0 до 1.
 * @param cellSize - Размер клетки в пикселях.
 * @param layer - Слой относительно модели.
 */
export const drawSpawn = (
  ctx: CanvasRenderingContext2D,
  owner: Owner,
  progress: number,
  cellSize: number,
  layer: 'under' | 'over',
  team: TeamStyle = TEAM_MARKERS[owner],
) => {
  const fade = 1 - progress;
  ctx.scale(cellSize / 32, cellSize / 32);

  if (layer === 'under') {
    ctx.globalAlpha = fade;
    ctx.strokeStyle = team.color;
    ctx.lineWidth = 2.6 * fade + 0.5;
    ctx.beginPath();
    ctx.ellipse(
      16,
      26.2,
      12.5 + progress * 8,
      4 + progress * 3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.fillStyle = 'rgba(232, 218, 182, 0.9)';
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7 + 0.3;
      const distance = 11 + progress * 8;
      ctx.beginPath();
      ctx.arc(
        16 + Math.cos(angle) * distance,
        26.2 + Math.sin(angle) * distance * 0.36 - progress * 2.5,
        2.4 * fade + 0.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    return;
  }

  ctx.fillStyle = team.color;
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.6)';
  ctx.lineWidth = 0.6;
  for (const [sx, delay] of [
    [6, 0],
    [26, 0.12],
    [11, 0.28],
    [21, 0.05],
    [16, 0.4],
  ]) {
    const local = Math.max(0, (progress - delay) / (1 - delay));
    if (local <= 0) continue;
    ctx.globalAlpha = Math.min(1, (1 - local) * 1.6);
    const sy = 22 - local * 22;
    const size = 2.6 * (1 - local * 0.4);
    ctx.beginPath();
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx + size * 0.32, sy - size * 0.32);
    ctx.lineTo(sx + size, sy);
    ctx.lineTo(sx + size * 0.32, sy + size * 0.32);
    ctx.lineTo(sx, sy + size);
    ctx.lineTo(sx - size * 0.32, sy + size * 0.32);
    ctx.lineTo(sx - size, sy);
    ctx.lineTo(sx - size * 0.32, sy - size * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};

/**
 * Завершение стройки: пыль у основания и два молотка, бьющих по крыше.
 * Отличается от найма юнита, у которого искры цвета стороны.
 *
 * @param ctx - Контекст, сдвинутый в левый верхний угол клетки.
 * @param progress - Доля прошедшего времени от 0 до 1.
 * @param cellSize - Размер клетки в пикселях.
 * @param layer - Пыль под моделью, молотки поверх.
 */
export const drawConstruction = (
  ctx: CanvasRenderingContext2D,
  progress: number,
  cellSize: number,
  layer: 'under' | 'over',
) => {
  const fade = 1 - progress;
  ctx.scale(cellSize / 32, cellSize / 32);

  if (layer === 'under') {
    ctx.fillStyle = 'rgba(214, 196, 160, 0.85)';
    for (let i = 0; i < 9; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const spread = 6 + (i / 9) * 8 + progress * 9;
      ctx.globalAlpha = fade * 0.9;
      ctx.beginPath();
      ctx.arc(
        16 + side * spread,
        27 - progress * (3 + (i % 3) * 2),
        (2.8 - (i % 3) * 0.5) * (0.5 + fade * 0.7),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    return;
  }

  ctx.globalAlpha = Math.min(1, fade * 2);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = '#1c2420';
  for (const [x, phase, mirror] of [
    [8, 0, 1],
    [24, 0.5, -1],
  ] as const) {
    // Три удара за эффект: угол качается от замаха к крыше.
    const swing = Math.abs(Math.sin((progress * 3 + phase) * Math.PI));
    ctx.save();
    ctx.translate(x, 9);
    ctx.scale(mirror, 1);
    ctx.rotate(-0.2 - swing * 0.9);
    ctx.fillStyle = '#a87945';
    ctx.fillRect(-0.7, -1, 1.4, 8);
    ctx.strokeRect(-0.7, -1, 1.4, 8);
    ctx.fillStyle = '#c6d1d5';
    ctx.fillRect(-2.6, -2.6, 5.2, 2.6);
    ctx.strokeRect(-2.6, -2.6, 5.2, 2.6);
    ctx.restore();
  }
};

/**
 * Отметка над клеткой: «!» замеченной угрозы или «×» отказа приказа.
 * Дублирует звук сигнала; форма, а не только цвет, различает их.
 *
 * @param ctx - Контекст, сдвинутый в левый верхний угол клетки.
 * @param kind - Вид отметки.
 * @param progress - Доля прошедшего времени от 0 до 1.
 * @param cellSize - Размер клетки в пикселях.
 */
export const drawSignal = (
  ctx: CanvasRenderingContext2D,
  kind: 'threat' | 'reject',
  progress: number,
  cellSize: number,
) => {
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.globalAlpha = Math.min(1, (1 - progress) * 2.5);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(22, 30, 28, 0.6)';
  ctx.fillStyle = kind === 'threat' ? '#ff8a72' : '#f2c744';

  if (kind === 'threat') {
    ctx.strokeStyle = '#ff8a72';
    ctx.beginPath();
    ctx.arc(16, 16, 10 + progress * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(13, -2, 6, 10, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, 11, 1.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 9);
  ctx.lineTo(23, 23);
  ctx.moveTo(23, 9);
  ctx.lineTo(9, 23);
  ctx.strokeStyle = 'rgba(22, 30, 28, 0.7)';
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#ff8a72';
  ctx.stroke();
};

/**
 * Падение камня осады: тёмная воронка под моделями, поверх — кольцо удара,
 * пыль и разлетающиеся обломки. Видно и при ударе по пустой клетке.
 *
 * @param ctx - Контекст, сдвинутый в левый верхний угол клетки.
 * @param progress - Доля прошедшего времени от 0 до 1.
 * @param layer - Воронка под моделью, удар поверх.
 */
export const drawImpact = (
  ctx: CanvasRenderingContext2D,
  progress: number,
  cellSize: number,
  layer: 'under' | 'over',
) => {
  const fade = 1 - progress;
  ctx.scale(cellSize / 32, cellSize / 32);
  if (layer === 'under') {
    ctx.globalAlpha = Math.min(1, fade * 2) * 0.55;
    ctx.fillStyle = '#3a2f24';
    ctx.beginPath();
    ctx.ellipse(16, 22, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.globalAlpha = fade;
  ctx.strokeStyle = '#f2d39a';
  ctx.lineWidth = 2.2 * fade + 0.4;
  ctx.beginPath();
  ctx.ellipse(
    16,
    22,
    6 + progress * 12,
    2.5 + progress * 4.5,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.fillStyle = 'rgba(214, 196, 160, 0.85)';
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 * i) / 7;
    ctx.beginPath();
    ctx.arc(
      16 + Math.cos(angle) * (4 + progress * 9),
      21 + Math.sin(angle) * (2 + progress * 3) - progress * 4,
      (2.6 - (i % 2)) * (0.6 + progress),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = '#7d7f78';
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI * (0.1 + (i / 6) * 0.8);
    const distance = 3 + progress * (8 + (i % 3) * 3);
    ctx.fillRect(
      16 + Math.cos(angle) * distance,
      20 + Math.sin(angle) * distance + progress * progress * 10,
      1.6,
      1.6,
    );
  }
};

/**
 * Наводка орудия: кольцо сходится к отметке удара и гаснет — цель взята.
 *
 * @param ctx - Контекст, сдвинутый в левый верхний угол клетки.
 * @param progress - Доля прошедшего времени от 0 до 1.
 */
export const drawAim = (
  ctx: CanvasRenderingContext2D,
  progress: number,
  cellSize: number,
) => {
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.globalAlpha = Math.min(1, (1 - progress) * 2);
  ctx.strokeStyle = '#ff8a72';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(16, 16, 18 - progress * 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
};
