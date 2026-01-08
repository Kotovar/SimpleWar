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
 * @param options.customYOffsetRatio - Переопределяет вертикальный отступ бара (по умолчанию {@link HP_BAR_Y_OFFSET_RATIO})
 * @param options.customWidthRatio - Переопределяет ширину бара (по умолчанию {@link HP_BAR_WIDTH_RATIO})
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

  ctx.strokeStyle = HP_BAR.colorBorder;
  ctx.lineWidth = HP_BAR.lineWidth;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = HP_BAR.colorRed;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const fillWidth = barWidth * Math.max(0, Math.min(1, restHp));
  ctx.fillStyle = HP_BAR.colorGreen;
  ctx.fillRect(barX, barY, fillWidth, barHeight);
};
