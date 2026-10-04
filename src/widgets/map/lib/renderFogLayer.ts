import { FOG } from '@shared/config';
import type { CellRange } from '@shared/lib';
import type { ParticipantKnowledge } from '@entities/perceptions';

const snap = (value: number, ratio: number) =>
  Math.round(value * ratio) / ratio;

/**
 * Рисует туман в диапазоне клеток: видимые прозрачны, разведанные
 * затемнены, неизвестные закрыты сплошь. Два общих контура с округлёнными
 * углами и размытием сглаживают ступеньки клеток, не размывая местность
 * и объекты под ними.
 * Запас клеток сохраняет переходы у края окна; у края карты повторяется
 * состояние крайней клетки, чтобы сплошной туман не становился прозрачным.
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
  const { width, height, visible, terrain } = knowledge;
  if (!width || !height || range.x0 >= range.x1 || range.y0 >= range.y1) return;

  const ratio = ctx.getTransform().a || 1;
  const x0 = Math.max(-1, range.x0 - 1);
  const x1 = Math.min(width + 1, range.x1 + 1);
  const y0 = Math.max(-1, range.y0 - 1);
  const y1 = Math.min(height + 1, range.y1 + 1);
  const covered = (x: number, y: number, unknown: boolean) => {
    const index =
      Math.min(height - 1, Math.max(0, y)) * width +
      Math.min(width - 1, Math.max(0, x));
    return !visible[index] && (!unknown || !terrain[index]);
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width * cellSize, height * cellSize);
  ctx.clip();
  // filter работает в пикселях буфера: на HiDPI ширина перехода та же.
  ctx.filter = `blur(${cellSize * ratio * 0.2}px)`;
  const radius = cellSize * 0.4;

  for (const unknown of [false, true]) {
    ctx.beginPath();
    for (let y = y0; y < y1; y++) {
      const top = snap(y * cellSize, ratio);
      const rowHeight = snap((y + 1) * cellSize, ratio) - top;
      let x = x0;
      while (x < x1) {
        const filled = covered(x, y, unknown);
        let end = x + 1;
        while (end < x1 && covered(end, y, unknown) === filled) end++;
        if (filled) {
          const left = snap(x * cellSize, ratio);
          const exposedLeft = !covered(x - 1, y, unknown);
          const exposedRight = !covered(end, y, unknown);
          // Общие углы соседних полос остаются прямыми: внутри нет дыр.
          ctx.roundRect(
            left,
            top,
            snap(end * cellSize, ratio) - left,
            rowHeight,
            [
              exposedLeft && !covered(x, y - 1, unknown) ? radius : 0,
              exposedRight && !covered(end - 1, y - 1, unknown) ? radius : 0,
              exposedRight && !covered(end - 1, y + 1, unknown) ? radius : 0,
              exposedLeft && !covered(x, y + 1, unknown) ? radius : 0,
            ],
          );
        }
        x = end;
      }
    }
    // Один fill на контур: соседние полосы размываются вместе, без швов.
    ctx.fillStyle = unknown ? FOG.unknown : FOG.explored;
    ctx.fill();
  }
  ctx.restore();
};
