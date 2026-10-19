import type { Cell } from '@shared/config';
import { GRID } from '@shared/config';
import { sample, smoothNoise, type CellRange } from '@shared/lib';
import { forEachCellIn, getFullRange } from './cellRange';
import { drawGroundDetails } from './drawGroundDetails';
import { buildSilhouette, fillSilhouette } from './drawSilhouette';
import { drawShallows } from './drawShallows';

/**
 * Плотность буфера слоя: масштаб, который задал `setupCanvas`.
 *
 * Границы клеток и линии сетки округляем по ней. Иначе при дробном
 * `cellSize × devicePixelRatio` часть границ попадает на половину пикселя
 * экрана: через одну они размываются и темнеют, и клетки визуально
 * собираются в блоки 2×2.
 */
const getPixelRatio = (ctx: CanvasRenderingContext2D) =>
  ctx.getTransform().a || 1;

const snap = (value: number, ratio: number) =>
  Math.round(value * ratio) / ratio;

const drawCellBackground = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  variation: number,
  ratio: number,
) => {
  // Без запасного нуля неверный шум даёт невалидный цвет: клетка остаётся
  // закрашенной предыдущим цветом или чёрным.
  const shade = Number.isFinite(variation) ? variation : 0;
  // Луга: основной цвет плавно переходит в сухую траву крупными пятнами.
  const dry = Math.max(0, smoothNoise(x, y, 6, 211) - 0.35) * 1.1;
  const mix = (from: number, to: number) =>
    Math.round(from + (to - from) * dry + shade);
  const { colorGrass: lush, colorGrassDry: sere } = GRID;

  ctx.fillStyle = `rgb(${mix(lush.r, sere.r)}, ${mix(lush.g, sere.g)}, ${mix(lush.b, sere.b)})`;

  const left = snap(x * cellSize, ratio);
  const top = snap(y * cellSize, ratio);

  ctx.fillRect(
    left,
    top,
    snap((x + 1) * cellSize, ratio) - left,
    snap((y + 1) * cellSize, ratio) - top,
  );
};

// Блики на воде: короткие дуги, обрезанные по силуэту водоёма, чтобы не вылезать на берег.
const drawWaterRipples = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  water: Path2D,
  cellSize: number,
  range: CellRange,
) => {
  ctx.save();
  ctx.clip(water);
  ctx.lineCap = 'round';
  ctx.lineWidth = cellSize * 0.05;

  forEachCellIn(grid, range, (cell, x, y) => {
    if (cell.type !== 'water') return;
    const seed = sample(x, y, 613);
    if (seed > 0.5) return;

    const left = x * cellSize;
    const top = y * cellSize;
    const cx = left + (0.25 + sample(x, y, 271) * 0.5) * cellSize;
    const cy = top + (0.25 + sample(x, y, 457) * 0.5) * cellSize;
    const radius = cellSize * (0.16 + seed * 0.22);

    ctx.strokeStyle = 'rgba(226, 240, 255, 0.24)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(16, 66, 120, 0.22)';
    ctx.beginPath();
    ctx.arc(cx, cy + radius * 0.7, radius * 0.7, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  });

  ctx.restore();
};

export const drawBackgroundAndGrid = (
  ctx: CanvasRenderingContext2D,
  _gridSize: number,
  noise: number[][],
  grid: Cell[][],
  cellSize: number,
  builtCells: ReadonlySet<string> = new Set(),
  /** Рисуемые клетки с запасом по краям окна; без него — вся карта. */
  range: CellRange = getFullRange(grid),
) => {
  const ratio = getPixelRatio(ctx);

  forEachCellIn(grid, range, (_, x, y) => {
    drawCellBackground(ctx, x, y, cellSize, (noise[y]?.[x] ?? 0) * 0.5, ratio);
  });

  drawGroundDetails(ctx, grid, cellSize, builtCells, range);

  // Подложки под лесом и скалами: массив читается целиком, а не набором значков.
  fillSilhouette(
    ctx,
    buildSilhouette(
      grid,
      cellSize,
      cell => cell.type === 'forest',
      0.34,
      range,
    ),
    GRID.colorForestFloor,
    cellSize * ratio,
  );
  fillSilhouette(
    ctx,
    buildSilhouette(
      grid,
      cellSize,
      cell => cell.type === 'mountain' || cell.type === 'gold',
      0.3,
      range,
    ),
    GRID.colorRockFloor,
    cellSize * ratio,
  );

  // Топь лежит под водой: вогнутые берега заходят в соседние клетки.
  fillSilhouette(
    ctx,
    buildSilhouette(grid, cellSize, cell => cell.type === 'swamp', 0.34, range),
    GRID.colorSwampFloor,
    cellSize * ratio,
  );

  const water = buildSilhouette(
    grid,
    cellSize,
    cell => cell.type === 'water',
    undefined,
    range,
  );

  ctx.save();
  const { r, g, b } = GRID.colorWater;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.shadowColor = 'rgba(40, 64, 40, 0.45)';
  ctx.shadowBlur = cellSize * ratio * 0.24;
  ctx.fill(water);
  // Тень цельного силуэта даёт берег без обводок внутренних границ клеток.
  ctx.shadowColor = '#bdba82';
  ctx.shadowBlur = 0;
  const shore = cellSize * ratio * 0.055;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    ctx.shadowOffsetX = dx * shore;
    ctx.shadowOffsetY = dy * shore;
    ctx.fill(water);
  }
  ctx.restore();

  let hasWater = false;
  forEachCellIn(grid, range, cell => {
    hasWater ||= cell.type === 'water';
  });
  if (hasWater) drawShallows(ctx, water, range, cellSize);
  drawWaterRipples(ctx, grid, water, cellSize, range);

  // Сетка поверх: каждая линия — ровно один пиксель экрана без сглаживания,
  // поэтому все линии одинаковой толщины на любом масштабе. Число линий
  // по осям своё: на прямоугольной карте строк и колонок разное количество.
  const lineWidth = GRID.lineThickness / ratio;
  const top = range.y0 * cellSize;
  const left = range.x0 * cellSize;
  const width = (range.x1 - range.x0) * cellSize;
  const height = (range.y1 - range.y0) * cellSize;

  ctx.fillStyle = GRID.lineColor;
  for (let x = range.x0; x <= range.x1; x++) {
    ctx.fillRect(snap(x * cellSize, ratio), top, lineWidth, height);
  }
  for (let y = range.y0; y <= range.y1; y++) {
    ctx.fillRect(left, snap(y * cellSize, ratio), width, lineWidth);
  }
};
