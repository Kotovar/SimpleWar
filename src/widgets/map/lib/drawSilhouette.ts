import type { Cell } from '@shared/config';
import type { CellRange } from '@shared/lib';
import { forEachCellIn } from './cellRange';

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
  /** Клетки, попадающие в силуэт; маска соседей строится по всей карте. */
  range?: CellRange,
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

  forEachCellIn(grid, range, (_, x, y) =>
    drawCell(path, parts, x, y, cellSize, radius),
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
