import { FOG } from '@shared/config';
import type { CellRange } from '@shared/lib';
import type { ParticipantKnowledge } from '@entities/perceptions';

const snap = (value: number, ratio: number) =>
  Math.round(value * ratio) / ratio;

/** Сторона плитки облаков, px; плитка покрывает 13 × 13 клеток. */
const CLOUD_TILE = 384;
const CLOUD_CELLS = 13;

let cloudTile: HTMLCanvasElement | null | undefined;

/**
 * Бесшовная плитка облаков неразведанного: непрозрачная основа цвета
 * тумана и мягкие светлые и тёмные пятна. Пятна у края повторяются со
 * сдвигом на плитку, поэтому стыков нет. Без Canvas (тесты) — `null`.
 */
const getCloudTile = () => {
  if (cloudTile !== undefined) return cloudTile;
  const canvas =
    typeof document === 'undefined' ? null : document.createElement('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return (cloudTile = null);
  canvas.width = canvas.height = CLOUD_TILE;
  ctx.fillStyle = FOG.unknown;
  ctx.fillRect(0, 0, CLOUD_TILE, CLOUD_TILE);
  // Детерминированный разброс: рисунок не меняется между запусками.
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 60; i++) {
    const x = random() * CLOUD_TILE;
    const y = random() * CLOUD_TILE;
    const r = 20 + random() ** 2 * 110;
    const light = i % 3 !== 0;
    const color = light ? '120 140 165' : '0 0 0';
    const alpha = light ? 0.03 + random() * 0.04 : 0.18;
    for (const dx of [-CLOUD_TILE, 0, CLOUD_TILE]) {
      for (const dy of [-CLOUD_TILE, 0, CLOUD_TILE]) {
        const gradient = ctx.createRadialGradient(
          x + dx,
          y + dy,
          0,
          x + dx,
          y + dy,
          r,
        );
        gradient.addColorStop(0, `rgb(${color} / ${alpha})`);
        gradient.addColorStop(1, `rgb(${color} / 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  }
  return (cloudTile = canvas);
};

/** Заливка неразведанного: облака, привязанные к миру, иначе ровный цвет. */
const unknownFill = (ctx: CanvasRenderingContext2D, cellSize: number) => {
  const tile = getCloudTile();
  const pattern = tile && ctx.createPattern?.(tile, 'repeat');
  if (!pattern) return FOG.unknown;
  const scale = (CLOUD_CELLS * cellSize) / CLOUD_TILE;
  pattern.setTransform?.(new DOMMatrix().scale(scale, scale));
  return pattern;
};

/**
 * Рисует туман в диапазоне клеток: видимые прозрачны, разведанные
 * затемнены, неизвестные закрыты сплошь облаками. Два общих контура с округлёнными
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
    ctx.fillStyle = unknown ? unknownFill(ctx, cellSize) : FOG.explored;
    ctx.fill();
  }
  ctx.restore();
};
