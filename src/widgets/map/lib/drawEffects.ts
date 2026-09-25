import { TEAM_MARKERS, type Owner } from '@shared/config';

/** Мгновенный эффект над клеткой: попадание, число урона, гибель или появление. */
export type Effect = {
  x: number;
  y: number;
  /** Урон; отсутствует, если сущность просто исчезла с поля. */
  damage?: number;
  lethal?: boolean;
  /** Сторона новой сущности: эффект появления юнита или здания. */
  spawn?: Owner;
  start: number;
};

export const EFFECT_DURATION = 700;
const FLASH_PART = 0.3;

/**
 * Рисует эффект попадания: вспышка по клетке и всплывающее число урона.
 *
 * @param progress - Доля прожитого времени эффекта от 0 до 1.
 */
/**
 * Появление юнита или здания в едином стиле для найма и постройки.
 *
 * Под моделью (`under`) от края постамента расходится кольцо цвета стороны
 * и разлетается пыль; поверх модели (`over`) поднимаются искры.
 */
const drawSpawn = (
  ctx: CanvasRenderingContext2D,
  owner: Owner,
  progress: number,
  cellSize: number,
  layer: EffectLayer,
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

/** Слой эффекта относительно моделей: под ними или поверх. */
export type EffectLayer = 'under' | 'over';

export const drawEffect = (
  ctx: CanvasRenderingContext2D,
  effect: Effect,
  progress: number,
  cellSize: number,
  layer: EffectLayer = 'over',
) => {
  const { x, y, damage, lethal, spawn } = effect;

  if (spawn) {
    ctx.save();
    ctx.translate(x * cellSize, y * cellSize);
    drawSpawn(ctx, spawn, progress, cellSize, layer);
    ctx.restore();
    return;
  }

  // Попадание и гибель рисуются только поверх моделей.
  if (layer === 'under') return;

  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);

  // Вспышка живёт только первую треть эффекта, число — всё время.
  if (progress < FLASH_PART) {
    const fade = 1 - progress / FLASH_PART;
    ctx.save();
    ctx.globalAlpha = fade * 0.75;
    ctx.fillStyle = lethal ? '#ffd9c4' : '#ffb59a';
    ctx.beginPath();
    ctx.roundRect(
      cellSize * 0.1,
      cellSize * 0.1,
      cellSize * 0.8,
      cellSize * 0.8,
      cellSize * 0.18,
    );
    ctx.fill();
    ctx.restore();
  }

  if (lethal) {
    // Разлетающиеся клочья подсказывают, что сущность уничтожена, а не ушла.
    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.7;
    ctx.fillStyle = '#6d5a4c';
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const distance = cellSize * (0.12 + progress * 0.4);
      ctx.beginPath();
      ctx.arc(
        cellSize / 2 + Math.cos(angle) * distance,
        cellSize / 2 + Math.sin(angle) * distance,
        cellSize * 0.09 * (1 - progress),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  if (damage) {
    const rise = cellSize * (0.35 + progress * 0.6);
    ctx.globalAlpha = Math.min(1, (1 - progress) * 2.5);
    ctx.font = `bold ${Math.round(cellSize * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = cellSize * 0.1;
    ctx.strokeStyle = '#3a2723';
    ctx.fillStyle = lethal ? '#ffd27a' : '#ff9d84';
    const text = `−${damage}`;
    ctx.strokeText(text, cellSize / 2, cellSize / 2 - rise);
    ctx.fillText(text, cellSize / 2, cellSize / 2 - rise);
  }

  ctx.restore();
};
