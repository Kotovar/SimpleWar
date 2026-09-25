import type { Cell } from '@shared/config';
import { GRID } from '@shared/config';

type Predicate = (cell: Cell) => boolean;

/**
 * Собирает единый силуэт клеток, подходящих под `predicate`.
 *
 * Внешние углы скругляются, вогнутые заливаются дугой: соседние клетки
 * сливаются в одно пятно без швов по границам клеток.
 */
export const buildSilhouette = (
  grid: Cell[][],
  cellSize: number,
  predicate: Predicate,
  radiusRatio = 0.42,
) => {
  const path = new Path2D();
  const radius = cellSize * radiusRatio;
  const isPart = (x: number, y: number) => {
    const cell = grid[y]?.[x];
    return !!cell && predicate(cell);
  };

  grid.forEach((row, y) =>
    row.forEach((_, x) => {
      const left = x * cellSize;
      const top = y * cellSize;
      const north = isPart(x, y - 1);
      const east = isPart(x + 1, y);
      const south = isPart(x, y + 1);
      const west = isPart(x - 1, y);

      if (isPart(x, y)) {
        // Оставляем место берегу внутри Canvas: за границей буфера он обрезается.
        const edgeInset = cellSize * 0.1;
        const insetLeft = x === 0 ? edgeInset : 0;
        const insetTop = y === 0 ? edgeInset : 0;
        const insetRight = x === row.length - 1 ? edgeInset : 0;
        const insetBottom = y === grid.length - 1 ? edgeInset : 0;
        path.roundRect(
          left + insetLeft,
          top + insetTop,
          cellSize - insetLeft - insetRight,
          cellSize - insetTop - insetBottom,
          [
            !north && !west ? radius : 0,
            !north && !east ? radius : 0,
            !south && !east ? radius : 0,
            !south && !west ? radius : 0,
          ],
        );
        return;
      }

      // Скругляем вогнутый угол только при наличии пятна за обоими
      // рёбрами и по диагонали: отдельные пятна не соединяются уголками.
      const corners = [
        { dx: -1, dy: -1, wet: north && west },
        { dx: 1, dy: -1, wet: north && east },
        { dx: 1, dy: 1, wet: south && east },
        { dx: -1, dy: 1, wet: south && west },
      ];
      for (const { dx, dy, wet } of corners) {
        if (!wet || !isPart(x + dx, y + dy)) continue;
        const cx = left + (dx > 0 ? cellSize : 0);
        const cy = top + (dy > 0 ? cellSize : 0);
        path.moveTo(cx, cy);
        path.lineTo(cx - dx * radius, cy);
        path.quadraticCurveTo(cx, cy, cx, cy - dy * radius);
        path.closePath();
      }
    }),
  );

  return path;
};

export const fillSilhouette = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  color: string,
  bufferCellSize: number,
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(30, 50, 30, 0.35)';
  ctx.shadowBlur = bufferCellSize * 0.12;
  ctx.fill(path);
  ctx.restore();
};

/**
 * Мелководье: светлое свечение вдоль берега внутри водоёма.
 *
 * Маска суши рисуется вне воды и обрезается по её силуэту, внутрь попадает
 * только размытая тень маски. Полоса повторяет форму берега без ступенек
 * по границам клеток, а середина крупного озера остаётся тёмной.
 *
 * Маска всё равно размывается, поэтому хватает 16 px на клетку: буфер
 * не растёт с масштабом и плотностью экрана. Саму маску рисуем за левым
 * краем холста и возвращаем на место только её тень: иначе сглаженный
 * край маски низкого разрешения ложится на воду тёмной рваной каймой.
 */
export const drawShallows = (
  ctx: CanvasRenderingContext2D,
  water: Path2D,
  columns: number,
  rows: number,
  cellSize: number,
) => {
  const MASK_CELL = 16;
  const mask = document.createElement('canvas');
  mask.width = columns * MASK_CELL;
  mask.height = rows * MASK_CELL;
  const maskCtx = mask.getContext('2d');
  if (!maskCtx) return;

  maskCtx.scale(MASK_CELL / cellSize, MASK_CELL / cellSize);
  maskCtx.fill(water);
  maskCtx.setTransform(1, 0, 0, 1, 0, 0);
  maskCtx.globalCompositeOperation = 'source-out';
  maskCtx.fillRect(0, 0, mask.width, mask.height);

  const width = columns * cellSize;
  const height = rows * cellSize;
  // Смещение и размытие тени задаются в пикселях буфера, без трансформации.
  const ratio = ctx.getTransform().a || 1;
  const shift = width + cellSize;

  ctx.save();
  ctx.clip(water);
  ctx.shadowColor = GRID.colorWaterShallow;
  ctx.shadowBlur = cellSize * ratio * 0.35;
  ctx.shadowOffsetX = shift * ratio;
  ctx.drawImage(mask, -shift, 0, width, height);
  ctx.restore();
};
