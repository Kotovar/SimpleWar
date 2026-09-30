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

/** Сторона тайла частичной перерисовки, клеток. */
const TILE = 8;

/** Соседи, которых задевает изменение клетки: берега, подложки, мелководье. */
const REACH = 2;

/** Запас рисования тайла, клеток: силуэты и мелководье у края диапазона. */
const MARGIN = 4;

/** Доля грязных тайлов, после которой дешевле перерисовать всё. */
const MAX_DIRTY_SHARE = 0.5;

/**
 * Тайлы кэша, где рельеф или площадки изменились. Клетка метит и
 * соседей: берега, подложки леса и скал зависят от соседних клеток.
 */
export const dirtyTiles = (
  cache: Pick<TerrainCache, 'range' | 'grid' | 'builtCells'>,
  grid: Cell[][],
  builtCells: ReadonlySet<string>,
) => {
  const { x0, y0, x1, y1 } = cache.range;
  const columns = Math.ceil((x1 - x0) / TILE);
  const tiles = new Set<number>();
  const mark = (x: number, y: number) => {
    for (let dy = -REACH; dy <= REACH; dy++) {
      for (let dx = -REACH; dx <= REACH; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx < x0 || cy < y0 || cx >= x1 || cy >= y1) continue;
        tiles.add(
          Math.floor((cy - y0) / TILE) * columns + Math.floor((cx - x0) / TILE),
        );
      }
    }
  };
  // Изменение прямо за краем кэша тоже задевает его граничные тайлы.
  const width = grid[0]?.length ?? 0;
  for (
    let y = Math.max(0, y0 - REACH);
    y < Math.min(grid.length, y1 + REACH);
    y++
  ) {
    for (
      let x = Math.max(0, x0 - REACH);
      x < Math.min(width, x1 + REACH);
      x++
    ) {
      const key = `${x},${y}`;
      if (
        cache.grid[y]?.[x]?.type !== grid[y]?.[x]?.type ||
        cache.builtCells.has(key) !== builtCells.has(key)
      ) {
        mark(x, y);
      }
    }
  }
  const total = columns * Math.ceil((y1 - y0) / TILE);
  return { tiles, columns, total };
};

/**
 * Перерисовывает один тайл кэша. Отсечение — по целым пикселям буфера,
 * рисование — с запасом `MARGIN` клеток в пределах кэша, чтобы соседние
 * силуэты и мелководье легли так же, как при полной перерисовке.
 */
const redrawTile = (
  cacheCtx: CanvasRenderingContext2D,
  cache: TerrainCache,
  grid: Cell[][],
  builtCells: ReadonlySet<string>,
  tileIndex: number,
  columns: number,
) => {
  const { range, cellSize, ratio } = cache;
  const tx = range.x0 + (tileIndex % columns) * TILE;
  const ty = range.y0 + Math.floor(tileIndex / columns) * TILE;
  const tile = {
    x0: tx,
    y0: ty,
    x1: Math.min(range.x1, tx + TILE),
    y1: Math.min(range.y1, ty + TILE),
  };
  const toPixel = (cells: number, origin: number) =>
    (cells - origin) * cellSize * ratio;
  const left = Math.floor(toPixel(tile.x0, range.x0));
  const top = Math.floor(toPixel(tile.y0, range.y0));
  const width = Math.ceil(toPixel(tile.x1, range.x0)) - left;
  const height = Math.ceil(toPixel(tile.y1, range.y0)) - top;

  cacheCtx.save();
  cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
  cacheCtx.beginPath();
  cacheCtx.rect(left, top, width, height);
  cacheCtx.clip();
  cacheCtx.clearRect(left, top, width, height);
  cacheCtx.setTransform(
    ratio,
    0,
    0,
    ratio,
    -range.x0 * cellSize * ratio,
    -range.y0 * cellSize * ratio,
  );
  renderTerrainLayer(
    cacheCtx,
    grid,
    cellSize,
    grid[0]?.length ?? 0,
    builtCells,
    {
      // Не шире кэша: полная перерисовка тоже рисует только его клетки.
      x0: Math.max(range.x0, tile.x0 - MARGIN),
      y0: Math.max(range.y0, tile.y0 - MARGIN),
      x1: Math.min(range.x1, tile.x1 + MARGIN),
      y1: Math.min(range.y1, tile.y1 + MARGIN),
    },
  );
  cacheCtx.restore();
};

/**
 * Обновляет кэш на месте, если изменилась только местность или площадки:
 * перерисовываются тайлы вокруг изменённых клеток. Разведка на отдалённой
 * камере иначе перерисовывает весь мир на каждом шаге.
 *
 * @returns `true`, если кэш обновлён; `false` — нужна полная перерисовка.
 */
const patchCache = (
  cache: TerrainCache,
  grid: Cell[][],
  builtCells: ReadonlySet<string>,
) => {
  if (
    cache.grid.length !== grid.length ||
    cache.grid[0]?.length !== grid[0]?.length
  ) {
    return false;
  }
  const { tiles, columns, total } = dirtyTiles(cache, grid, builtCells);
  if (tiles.size > total * MAX_DIRTY_SHARE) return false;
  const cacheCtx = cache.canvas.getContext('2d');
  if (!cacheCtx) return false;
  for (const tile of tiles) {
    redrawTile(cacheCtx, cache, grid, builtCells, tile, columns);
  }
  return true;
};

/**
 * Рисует рельеф через кэш: при сдвиге камеры внутри запаса готовая картинка
 * только копируется, при изменении местности или площадок перерисовываются
 * только затронутые тайлы, а полная перерисовка нужна при выходе за запас,
 * смене масштаба, плотности экрана, карты или многих изменениях сразу.
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

  const patchable =
    cache !== null &&
    !isFresh &&
    cache.cellSize === cellSize &&
    cache.ratio === ratio &&
    contains(cache.range, range);
  if (patchable && patchCache(cache!, grid, builtCells)) {
    cache = { ...cache!, grid, builtCells };
  } else if (!isFresh) {
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
