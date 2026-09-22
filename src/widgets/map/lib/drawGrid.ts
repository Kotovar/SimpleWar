import { Cell, GRID } from '@shared/config';
import { drawGroundDetails, sample } from './drawGroundDetails';

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
  color: { r: number; g: number; b: number },
  variation: number,
  ratio: number,
) => {
  // Без запасного нуля неверный шум даёт невалидный цвет: клетка остаётся
  // закрашенной предыдущим цветом или чёрным.
  const shade = Number.isFinite(variation) ? variation : 0;

  ctx.fillStyle = `rgb(${color.r + shade}, ${color.g + shade}, ${color.b + shade})`;

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
) => {
  ctx.save();
  ctx.clip(water);
  ctx.lineCap = 'round';
  ctx.lineWidth = cellSize * 0.05;

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
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
      ctx.arc(
        cx,
        cy + radius * 0.7,
        radius * 0.7,
        Math.PI * 1.2,
        Math.PI * 1.8,
      );
      ctx.stroke();
    }),
  );

  ctx.restore();
};

export const drawBackgroundAndGrid = (
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  noise: number[][],
  grid: Cell[][],
  cellSize: number,
) => {
  const ratio = getPixelRatio(ctx);

  grid.forEach((row, y) =>
    row.forEach((_, x) => {
      drawCellBackground(
        ctx,
        x,
        y,
        cellSize,
        GRID.colorGrass,
        noise[y]?.[x] ?? 0,
        ratio,
      );
    }),
  );

  drawGroundDetails(ctx, grid, cellSize);

  // Единый силуэт воды убирает швы между водными клетками.
  const water = new Path2D();
  const radius = cellSize * 0.42;
  const isWater = (x: number, y: number) => grid[y]?.[x]?.type === 'water';

  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      const left = x * cellSize;
      const top = y * cellSize;
      const north = isWater(x, y - 1);
      const east = isWater(x + 1, y);
      const south = isWater(x, y + 1);
      const west = isWater(x - 1, y);

      if (cell.type === 'water') {
        water.roundRect(left, top, cellSize, cellSize, [
          !north && !west ? radius : 0,
          !north && !east ? radius : 0,
          !south && !east ? radius : 0,
          !south && !west ? radius : 0,
        ]);
        return;
      }

      // Скругляем вогнутый берег только при наличии воды за обоими
      // рёбрами и по диагонали: отдельные озёра не соединяются уголками.
      const corners = [
        { dx: -1, dy: -1, wet: north && west },
        { dx: 1, dy: -1, wet: north && east },
        { dx: 1, dy: 1, wet: south && east },
        { dx: -1, dy: 1, wet: south && west },
      ];
      for (const { dx, dy, wet } of corners) {
        if (!wet || !isWater(x + dx, y + dy)) continue;
        const cx = left + (dx > 0 ? cellSize : 0);
        const cy = top + (dy > 0 ? cellSize : 0);
        water.moveTo(cx, cy);
        water.lineTo(cx - dx * radius, cy);
        water.quadraticCurveTo(cx, cy, cx, cy - dy * radius);
        water.closePath();
      }
    }),
  );

  ctx.save();
  const { r, g, b } = GRID.colorWater;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.shadowColor = '#b2c49a';
  ctx.shadowBlur = cellSize * 0.16;
  ctx.fill(water);
  ctx.restore();

  drawWaterRipples(ctx, grid, water, cellSize);

  // Сетка поверх: каждая линия — ровно один пиксель экрана без сглаживания,
  // поэтому все линии одинаковой толщины на любом масштабе.
  const width = (grid[0]?.length ?? gridSize) * cellSize;
  const height = grid.length * cellSize;
  const lineWidth = GRID.lineThickness / ratio;
  const columns = grid[0]?.length ?? gridSize;

  ctx.fillStyle = GRID.lineColor;
  // Число линий по каждой оси своё: на прямоугольной карте строк и колонок
  // разное количество.
  for (let x = 0; x <= columns; x++) {
    ctx.fillRect(snap(x * cellSize, ratio), 0, lineWidth, height);
  }
  for (let y = 0; y <= grid.length; y++) {
    ctx.fillRect(0, snap(y * cellSize, ratio), width, lineWidth);
  }
};
