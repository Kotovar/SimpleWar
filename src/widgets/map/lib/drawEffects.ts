/** Мгновенный эффект над клеткой: попадание, число урона или гибель. */
export type Effect = {
  x: number;
  y: number;
  /** Урон; отсутствует, если сущность просто исчезла с поля. */
  damage?: number;
  lethal?: boolean;
  start: number;
};

export const EFFECT_DURATION = 700;
const FLASH_PART = 0.3;

/**
 * Рисует эффект попадания: вспышка по клетке и всплывающее число урона.
 *
 * @param progress - Доля прожитого времени эффекта от 0 до 1.
 */
export const drawEffect = (
  ctx: CanvasRenderingContext2D,
  effect: Effect,
  progress: number,
  cellSize: number,
) => {
  const { x, y, damage, lethal } = effect;

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
