import { FOG } from '@shared/config';
import type { CellRange } from '@shared/lib';
import type { ParticipantKnowledge } from '@entities/perceptions';

const snap = (value: number, ratio: number) =>
  Math.round(value * ratio) / ratio;

/**
 * Рисует туман в диапазоне клеток: видимые прозрачны, разведанные
 * затемнены, неизвестные закрыты сплошь. Соседние клетки одного состояния
 * в строке сливаются в один прямоугольник: меньше вызовов и нет швов.
 *
 * @param ctx - Контекст холста тумана с трансформацией камеры.
 * @param knowledge - Знания смотрящего участника.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param range - Клетки в окне камеры.
 */
export const renderFogLayer = (
  ctx: CanvasRenderingContext2D,
  knowledge: ParticipantKnowledge,
  cellSize: number,
  range: CellRange,
) => {
  const { width, visible, terrain } = knowledge;
  const ratio = ctx.getTransform().a || 1;
  const state = (index: number) =>
    visible[index] ? 0 : terrain[index] ? 1 : 2;
  const colors = [null, FOG.explored, FOG.unknown];

  for (let y = range.y0; y < range.y1; y++) {
    const top = snap(y * cellSize, ratio);
    const height = snap((y + 1) * cellSize, ratio) - top;
    let x = range.x0;
    while (x < range.x1) {
      const kind = state(y * width + x);
      let end = x + 1;
      while (end < range.x1 && state(y * width + end) === kind) end++;
      const color = colors[kind];
      if (color) {
        const left = snap(x * cellSize, ratio);
        ctx.fillStyle = color;
        ctx.fillRect(left, top, snap(end * cellSize, ratio) - left, height);
      }
      x = end;
    }
  }
};
