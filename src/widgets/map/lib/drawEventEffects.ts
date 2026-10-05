import { TEAM_MARKERS, type Owner } from '@shared/config';
import { drawForest } from '@shared/ui';

/** Заваливает деревья поверх уже расчищенной клетки, разбрасывая щепки. */
export const drawClearing = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress * 1.4);
  ctx.translate(cellSize * 0.5, cellSize * 0.85);
  ctx.rotate(progress * 1.1);
  ctx.scale(1, 1 - progress * 0.5);
  ctx.translate(-cellSize * 0.5, -cellSize * 0.85);
  ctx.translate(-x * cellSize, -y * cellSize);
  drawForest(ctx, x, y, cellSize);
  ctx.restore();

  ctx.globalAlpha = 1 - progress;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const distance = cellSize * progress * 0.7;
    ctx.fillStyle = i % 2 ? '#b58a54' : '#76a35a';
    ctx.fillRect(
      cellSize * 0.5 + Math.cos(angle) * distance,
      cellSize * 0.65 +
        Math.sin(angle) * distance * 0.45 -
        Math.sin(progress * Math.PI) * cellSize * 0.25,
      cellSize * 0.07,
      cellSize * 0.04,
    );
  }
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
) => {
  const team = TEAM_MARKERS[owner];
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
