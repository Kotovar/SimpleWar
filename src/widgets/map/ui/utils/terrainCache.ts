import type { Cell } from '@shared/config';
import type { CellRange } from '@shared/lib';
import { renderTerrainLayer, withClear } from '@widgets/map/lib';
import { getPixelRatio } from './getCtx';

/** Запас кэша вокруг окна, доля видимого размера с каждой стороны. */
const PADDING = 0.25;

/** Отрисованный рельеф вокруг окна камеры; не больше окна с запасом. */
export type TerrainCache = {
  canvas: HTMLCanvasElement;
  range: CellRange;
  grid: Cell[][];
  builtCells: ReadonlySet<string>;
  cellSize: number;
  ratio: number;
};

const contains = (outer: CellRange, inner: CellRange) =>
  inner.x0 >= outer.x0 &&
  inner.y0 >= outer.y0 &&
  inner.x1 <= outer.x1 &&
  inner.y1 <= outer.y1;

const pad = (range: CellRange, columns: number, rows: number): CellRange => {
  const dx = Math.ceil((range.x1 - range.x0) * PADDING);
  const dy = Math.ceil((range.y1 - range.y0) * PADDING);
  return {
    x0: Math.max(0, range.x0 - dx),
    y0: Math.max(0, range.y0 - dy),
    x1: Math.min(columns, range.x1 + dx),
    y1: Math.min(rows, range.y1 + dy),
  };
};

/**
 * Рисует рельеф через кэш: при сдвиге камеры внутри запаса готовая картинка
 * только копируется, а полная перерисовка нужна при выходе за запас, смене
 * масштаба, плотности экрана, карты или площадок под зданиями.
 *
 * @param ctx - Контекст слоя с трансформацией камеры.
 * @param previous - Прежний кэш; переиспользуется его холст.
 * @param grid - Местность сцены.
 * @param builtCells - Клетки под зданиями в виде `"x,y"`.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param range - Клетки в окне камеры.
 * @returns Актуальный кэш.
 */
export const drawCachedTerrain = (
  ctx: CanvasRenderingContext2D,
  previous: TerrainCache | null,
  grid: Cell[][],
  builtCells: ReadonlySet<string>,
  cellSize: number,
  range: CellRange,
): TerrainCache => {
  const ratio = getPixelRatio();
  let cache = previous;
  const isFresh =
    cache?.grid === grid &&
    cache.builtCells === builtCells &&
    cache.cellSize === cellSize &&
    cache.ratio === ratio &&
    contains(cache.range, range);

  if (!isFresh) {
    const area = pad(range, grid[0]?.length ?? 0, grid.length);
    const canvas = previous?.canvas ?? document.createElement('canvas');
    canvas.width = Math.max(
      1,
      Math.round((area.x1 - area.x0) * cellSize * ratio),
    );
    canvas.height = Math.max(
      1,
      Math.round((area.y1 - area.y0) * cellSize * ratio),
    );
    const cacheCtx = canvas.getContext('2d');
    if (cacheCtx) {
      cacheCtx.setTransform(
        ratio,
        0,
        0,
        ratio,
        -area.x0 * cellSize * ratio,
        -area.y0 * cellSize * ratio,
      );
      withClear(cacheCtx, () =>
        renderTerrainLayer(
          cacheCtx,
          grid,
          cellSize,
          grid[0]?.length ?? 0,
          builtCells,
          area,
        ),
      );
    }
    cache = { canvas, range: area, grid, builtCells, cellSize, ratio };
  }

  const { canvas, range: area } = cache!;
  withClear(ctx, () =>
    ctx.drawImage(
      canvas,
      area.x0 * cellSize,
      area.y0 * cellSize,
      (area.x1 - area.x0) * cellSize,
      (area.y1 - area.y0) * cellSize,
    ),
  );
  return cache!;
};
