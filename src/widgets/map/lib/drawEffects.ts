import type { Owner } from '@shared/config';
import { DETAIL_LEVEL } from '@shared/config';
import { drawConstruction, drawSignal, drawSpawn } from './drawEventEffects';

/** Мгновенный эффект над клеткой: попадание, число урона, гибель или появление. */
export type Effect = {
  x: number;
  y: number;
  /** Урон; отсутствует, если сущность просто исчезла с поля. */
  damage?: number;
  /** Фактически восстановленные HP. */
  healing?: number;
  lethal?: boolean;
  /** Сторона новой сущности: эффект появления юнита или здания. */
  spawn?: Owner;
  /** Новое здание: вместо искр найма — пыль и молотки стройки. */
  building?: boolean;
  /** Сигнал над клеткой: замеченная угроза или отказ приказа. */
  signal?: 'threat' | 'reject';
  start: number;
};

export const EFFECT_DURATION = 700;
const FLASH_PART = 0.3;

/** Слой эффекта относительно моделей: под ними или поверх. */
export type EffectLayer = 'under' | 'over';

/**
 * Рисует появление, попадание или гибель в нужном слое карты.
 *
 * @param ctx - Контекст холста.
 * @param effect - Координаты и вид эффекта.
 * @param progress - Доля прошедшего времени от 0 до 1.
 * @param cellSize - Размер клетки в пикселях.
 * @param layer - Слой относительно моделей; попадание рисуется только поверх.
 */
export const drawEffect = (
  ctx: CanvasRenderingContext2D,
  effect: Effect,
  progress: number,
  cellSize: number,
  layer: EffectLayer = 'over',
) => {
  const { x, y, damage, healing, lethal, spawn, building, signal } = effect;

  if (spawn || (signal && layer === 'over')) {
    ctx.save();
    ctx.translate(x * cellSize, y * cellSize);
    if (signal) drawSignal(ctx, signal, progress, cellSize);
    else if (building) drawConstruction(ctx, progress, cellSize, layer);
    else if (spawn) drawSpawn(ctx, spawn, progress, cellSize, layer);
    ctx.restore();
    return;
  }

  // Попадание и гибель рисуются только поверх моделей.
  if (layer === 'under' || signal) return;

  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);

  // Вспышка живёт только первую треть эффекта, число — всё время.
  if (progress < FLASH_PART) {
    const fade = 1 - progress / FLASH_PART;
    ctx.save();
    ctx.globalAlpha = fade * 0.75;
    ctx.fillStyle = healing ? '#b9f6ca' : lethal ? '#ffd9c4' : '#ffb59a';
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

  // Издалека число не прочитать: остаются вспышка и клочья.
  if ((damage || healing) && cellSize >= DETAIL_LEVEL.icon) {
    const rise = cellSize * (0.35 + progress * 0.6);
    ctx.globalAlpha = Math.min(1, (1 - progress) * 2.5);
    ctx.font = `bold ${Math.round(cellSize * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = cellSize * 0.1;
    ctx.strokeStyle = '#3a2723';
    ctx.fillStyle = healing ? '#86efac' : lethal ? '#ffd27a' : '#ff9d84';
    const text = healing ? `+${healing}` : `−${damage}`;
    ctx.strokeText(text, cellSize / 2, cellSize / 2 - rise);
    ctx.fillText(text, cellSize / 2, cellSize / 2 - rise);
  }

  ctx.restore();
};
