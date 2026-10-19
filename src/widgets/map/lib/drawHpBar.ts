import { HP_BAR } from '@shared/config';

/**
 * Рисует стандартный HP-бар над сущностью (юнитом или зданием).
 *
 * Бар центрируется по горизонтали, располагается сверху клетки.
 * По умолчанию скрывается при полном здоровье (restHp >= 1).
 *
 * @param ctx - Контекст Canvas для рисования
 * @param cellX - Координата клетки по X (в клетках)
 * @param cellY - Координата клетки по Y (в клетках)
 * @param cellSize - Размер одной клетки в пикселях
 * @param restHp - Доля оставшегося здоровья (0 — мертв, 1 — полное здоровье)
 * @param options - Опциональные настройки для кастомизации
 * @param options.customYOffsetRatio - Переопределяет вертикальный отступ бара (по умолчанию `HP_BAR.yOffsetRatio`)
 * @param options.customWidthRatio - Переопределяет ширину бара (по умолчанию `HP_BAR.widthRatio`)
 *
 * @example
 * drawHpBar(ctx, unit.x, unit.y, cellSize, unit.hp / unit.maxHp);
 *
 * @example
 * // Более широкий и высокий бар для крупного здания
 * drawHpBar(ctx, x, y, cellSize, hpRatio, {
 *   customWidthRatio: 0.7,
 *   customYOffsetRatio: 0.05
 * });
 */
export const drawHpBar = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  restHp: number,
  options?: {
    customYOffsetRatio?: number;
    customWidthRatio?: number;
  },
) => {
  const {
    customYOffsetRatio = HP_BAR.yOffsetRatio,
    customWidthRatio = HP_BAR.widthRatio,
  } = options ?? {};

  if (restHp >= 1) return;

  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  const barWidth = customWidthRatio * cellSize;
  const barHeight = HP_BAR.heightRatio * cellSize;
  const barX = baseX + (cellSize - barWidth) / 2;
  const barY = baseY + customYOffsetRatio * cellSize;

  const ratio = Number.isFinite(restHp) ? Math.max(0, Math.min(1, restHp)) : 0;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = HP_BAR.colorBackground;
  ctx.fill();
  ctx.strokeStyle = HP_BAR.colorBorder;
  ctx.lineWidth = HP_BAR.lineWidth;
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle =
    ratio <= 0.3
      ? HP_BAR.colorRed
      : ratio <= 0.6
        ? HP_BAR.colorAmber
        : HP_BAR.colorGreen;
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);
  ctx.restore();
};
