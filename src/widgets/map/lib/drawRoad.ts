import type { Cell, CellType } from '@shared/config';

/** Вид дороги на местности: полуширины обочины и полотна в клетке 32×32. */
type RoadStyle = {
  edge: string;
  fill: string;
  edgeHalf: number;
  fillHalf: number;
  /** Прозрачность: на холме сквозь тропу виден склон. */
  alpha: number;
  /** Колея по полотну. */
  ruts?: boolean;
  /** Поперечные доски гати. */
  planks?: boolean;
};

const STYLES: Partial<Record<CellType, RoadStyle>> = {
  grass: {
    edge: '#7f6a48',
    fill: '#c8ab78',
    edgeHalf: 8,
    fillHalf: 6.5,
    alpha: 1,
    ruts: true,
  },
  // Узкая тропа поверх склона: холм остаётся читаемым.
  hill: {
    edge: '#6f6446',
    fill: '#d6bf8e',
    edgeHalf: 4.5,
    fillHalf: 3.4,
    alpha: 0.8,
  },
  // Гать: настил из досок между заводями.
  swamp: {
    edge: '#4f3d26',
    fill: '#a07c4c',
    edgeHalf: 6,
    fillHalf: 5,
    alpha: 1,
    planks: true,
  },
};

const RUT_OFFSET = 2.8;
const RUT_WIDTH = 0.8;
const PLANK_STEP = 3;

/** Стороны клетки: смещение соседа. */
const SIDES = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

type Side = { dx: number; dy: number; next: RoadStyle };

/**
 * Полоса от центра к стороне: у центра своя полуширина, у края —
 * средняя со стилем соседа, поэтому стык разных покрытий без ступеньки.
 */
const band = (
  ctx: CanvasRenderingContext2D,
  { dx, dy }: Side,
  half: number,
  edgeHalf: number,
) => {
  // Перпендикуляр к направлению полосы.
  const px = -dy;
  const py = dx;
  const ex = 16 + dx * 16;
  const ey = 16 + dy * 16;
  ctx.moveTo(16 + px * half, 16 + py * half);
  ctx.lineTo(ex + px * edgeHalf, ey + py * edgeHalf);
  ctx.lineTo(ex - px * edgeHalf, ey - py * edgeHalf);
  ctx.lineTo(16 - px * half, 16 - py * half);
  ctx.closePath();
};

/** Слой дороги: полосы ко всем соседям и круг в центре — скругляет углы. */
const layer = (
  ctx: CanvasRenderingContext2D,
  sides: Side[],
  color: string,
  half: number,
  edgeHalf: (next: RoadStyle) => number,
) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  // Против часовой, как и полосы: при заливке перекрытия складываются,
  // а не вычитаются.
  ctx.arc(16, 16, half, 0, Math.PI * 2, true);
  for (const side of sides) {
    band(ctx, side, half, (half + edgeHalf(side.next)) / 2);
  }
  ctx.fill();
};

/**
 * Рисует дорогу на клетке по виду местности: грунтовка с колеёй на поле,
 * узкая тропа на холме, гать на болоте. Полосы к соседним дорогам
 * сходятся в центре, поэтому прямые, углы, развилки и перекрёстки
 * получаются сами; одиночная дорога — площадка.
 *
 * @param grid - Местность: по ней ищутся соседние дороги.
 */
export const drawRoad = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  x: number,
  y: number,
  cellSize: number,
) => {
  const style = STYLES[grid[y][x].type] ?? STYLES.grass!;
  const sides: Side[] = SIDES.flatMap(([dx, dy]) => {
    const cell = grid[y + dy]?.[x + dx];
    if (!cell?.road) return [];
    return [{ dx, dy, next: STYLES[cell.type] ?? STYLES.grass! }];
  });

  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.globalAlpha = style.alpha;

  layer(ctx, sides, style.edge, style.edgeHalf, next => next.edgeHalf);
  layer(ctx, sides, style.fill, style.fillHalf, next => next.fillHalf);

  if (style.ruts) {
    // Колея — кант общего контура: тёмный слой и полотно поже поверх,
    // так линии сходятся на углах и развилках.
    const rut = RUT_OFFSET + RUT_WIDTH / 2;
    const inner = RUT_OFFSET - RUT_WIDTH / 2;
    layer(ctx, sides, 'rgba(110, 88, 56, 0.6)', rut, () => rut);
    layer(ctx, sides, style.fill, inner, () => inner);
  }

  if (style.planks) {
    ctx.strokeStyle = '#6e5434';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const { dx, dy } of sides) {
      for (let t = style.fillHalf + 1; t < 16; t += PLANK_STEP) {
        const cx = 16 + dx * t;
        const cy = 16 + dy * t;
        ctx.moveTo(cx - dy * style.fillHalf, cy + dx * style.fillHalf);
        ctx.lineTo(cx + dy * style.fillHalf, cy - dx * style.fillHalf);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
};
