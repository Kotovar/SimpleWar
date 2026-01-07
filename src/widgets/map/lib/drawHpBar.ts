/**
 * Константы для настройки внешнего вида HP-бара.
 * Все размеры указаны в долях от размера клетки (cellSize).
 */
export const HP_BAR_WIDTH_RATIO = 0.44; // Ширина HP-бара относительно клетки
export const HP_BAR_HEIGHT_RATIO = 0.06; // Высота HP-бара
export const HP_BAR_Y_OFFSET_RATIO = 0.12; // Отступ сверху клетки
export const HP_BAR_LINE_WIDTH = 1; // Толщина обводки
export const HP_BAR_RED = '#ff0000'; // Цвет фона (пустое здоровье)
export const HP_BAR_GREEN = '#00ff00'; // Цвет заполнения (оставшееся здоровье)
export const HP_BAR_BORDER = '#000000'; // Цвет обводки

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
 * drawHpBar(ctx, unit.x, unit.y, CELL_SIZE, unit.hp / unit.maxHp);
 *
 * @example
 * // Более широкий и высокий бар для крупного здания
 * drawHpBar(ctx, x, y, CELL_SIZE, hpRatio, {
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
    customYOffsetRatio = HP_BAR_Y_OFFSET_RATIO,
    customWidthRatio = HP_BAR_WIDTH_RATIO,
  } = options ?? {};

  if (restHp >= 1) return;

  const baseX = cellX * cellSize;
  const baseY = cellY * cellSize;

  const barWidth = customWidthRatio * cellSize;
  const barHeight = HP_BAR_HEIGHT_RATIO * cellSize;
  const barX = baseX + (cellSize - barWidth) / 2;
  const barY = baseY + customYOffsetRatio * cellSize;

  ctx.strokeStyle = HP_BAR_BORDER;
  ctx.lineWidth = HP_BAR_LINE_WIDTH;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = HP_BAR_RED;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const fillWidth = barWidth * Math.max(0, Math.min(1, restHp));
  ctx.fillStyle = HP_BAR_GREEN;
  ctx.fillRect(barX, barY, fillWidth, barHeight);
};
