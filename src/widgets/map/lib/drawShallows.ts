import { GRID } from '@shared/config';
import type { CellRange } from '@shared/lib';

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
  range: CellRange,
  cellSize: number,
) => {
  const MASK_CELL = 16;
  const columns = range.x1 - range.x0;
  const rows = range.y1 - range.y0;
  if (columns <= 0 || rows <= 0) return;
  const mask = document.createElement('canvas');
  mask.width = columns * MASK_CELL;
  mask.height = rows * MASK_CELL;
  const maskCtx = mask.getContext('2d');
  if (!maskCtx) return;

  maskCtx.scale(MASK_CELL / cellSize, MASK_CELL / cellSize);
  maskCtx.translate(-range.x0 * cellSize, -range.y0 * cellSize);
  maskCtx.fill(water);
  maskCtx.setTransform(1, 0, 0, 1, 0, 0);
  maskCtx.globalCompositeOperation = 'source-out';
  maskCtx.fillRect(0, 0, mask.width, mask.height);

  const left = range.x0 * cellSize;
  const top = range.y0 * cellSize;
  const width = columns * cellSize;
  const height = rows * cellSize;
  // Смещение и размытие тени задаются в пикселях буфера, без трансформации.
  const ratio = ctx.getTransform().a || 1;
  // Маска целиком левее рисуемого диапазона, то есть вне окна камеры.
  const shift = width + cellSize;

  ctx.save();
  ctx.clip(water);
  ctx.shadowColor = GRID.colorWaterShallow;
  ctx.shadowBlur = cellSize * ratio * 0.35;
  ctx.shadowOffsetX = shift * ratio;
  ctx.drawImage(mask, left - shift, top, width, height);
  ctx.restore();
};
