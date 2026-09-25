import type { Cell } from '@shared/config';
import { GRID } from '@shared/config';

type Predicate = (cell: Cell) => boolean;

// Стороны по битам: север, восток, юг, запад.
const CONCAVE_CORNERS = [
  [-1, -1, 0b1001],
  [1, -1, 0b0011],
  [1, 1, 0b0110],
  [-1, 1, 0b1100],
] as const;

const isPartAt = (parts: Uint8Array[], x: number, y: number) =>
  parts[y]?.[x] === 1;

const getEdgeMask = (parts: Uint8Array[], x: number, y: number) => {
  const north = isPartAt(parts, x, y - 1);
  const east = isPartAt(parts, x + 1, y);
  const south = isPartAt(parts, x, y + 1);
  const west = isPartAt(parts, x - 1, y);

  return (
    (north ? 0b0001 : 0) |
    (east ? 0b0010 : 0) |
    (south ? 0b0100 : 0) |
    (west ? 0b1000 : 0)
  );
};

const getCornerRadii = (edgeMask: number, radius: number) => [
  (edgeMask & 0b1001) === 0 ? radius : 0,
  (edgeMask & 0b0011) === 0 ? radius : 0,
  (edgeMask & 0b0110) === 0 ? radius : 0,
  (edgeMask & 0b1100) === 0 ? radius : 0,
];

const drawPartCell = (
  path: Path2D,
  parts: Uint8Array[],
  x: number,
  y: number,
  cellSize: number,
  radius: number,
) => {
  const row = parts[y];
  const left = x * cellSize;
  const top = y * cellSize;
  const edgeInset = cellSize * 0.1;
  const insetLeft = x === 0 ? edgeInset : 0;
  const insetTop = y === 0 ? edgeInset : 0;
  const insetRight = x === row.length - 1 ? edgeInset : 0;
  const insetBottom = y === parts.length - 1 ? edgeInset : 0;
  const edgeMask = getEdgeMask(parts, x, y);

  path.roundRect(
    left + insetLeft,
    top + insetTop,
    cellSize - insetLeft - insetRight,
    cellSize - insetTop - insetBottom,
    getCornerRadii(edgeMask, radius),
  );
};

const drawConcaveCorners = (
  path: Path2D,
  parts: Uint8Array[],
  x: number,
  y: number,
  cellSize: number,
  radius: number,
) => {
  const left = x * cellSize;
  const top = y * cellSize;
  const edgeMask = getEdgeMask(parts, x, y);

  for (const [dx, dy, requiredEdges] of CONCAVE_CORNERS) {
    if (
      (edgeMask & requiredEdges) !== requiredEdges ||
      !isPartAt(parts, x + dx, y + dy)
    ) {
      continue;
    }
    const cx = left + (dx > 0 ? cellSize : 0);
    const cy = top + (dy > 0 ? cellSize : 0);
    path.moveTo(cx, cy);
    path.lineTo(cx - dx * radius, cy);
    path.quadraticCurveTo(cx, cy, cx, cy - dy * radius);
    path.closePath();
  }
};

const drawCell = (
  path: Path2D,
  parts: Uint8Array[],
  x: number,
  y: number,
  cellSize: number,
  radius: number,
) => {
  if (isPartAt(parts, x, y)) {
    drawPartCell(path, parts, x, y, cellSize, radius);
    return;
  }
  drawConcaveCorners(path, parts, x, y, cellSize, radius);
};

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
  const parts = grid.map(row => {
    const mask = new Uint8Array(row.length);
    row.forEach((cell, x) => {
      if (cell) mask[x] = predicate(cell) ? 1 : 0;
    });
    return mask;
  });

  grid.forEach((row, y) =>
    row.forEach((_, x) => drawCell(path, parts, x, y, cellSize, radius)),
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
