import type { Cell, CellType } from '@shared/config';

/** Вид дороги на местности: полуширины обочины и полотна в клетке 32×32. */
type RoadStyle = {
  edge: string;
  fill: string;
  edgeHalf: number;
  fillHalf: number;
  /** Поперечные доски гати. */
  planks?: boolean;
};

const STYLES: Partial<Record<CellType, RoadStyle>> = {
  grass: {
    edge: '#887a52',
    fill: '#b7a575',
    edgeHalf: 4.8,
    fillHalf: 4,
  },
  // Узкая тропа поверх склона: холм остаётся читаемым.
  hill: {
    edge: '#8c805a',
    fill: '#c0b083',
    edgeHalf: 3.8,
    fillHalf: 3.1,
  },
  // Гать: настил из досок между заводями.
  swamp: {
    edge: '#6e6546',
    fill: '#a5976c',
    edgeHalf: 4.8,
    fillHalf: 4,
    planks: true,
  },
};

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
  style: RoadStyle,
  color: 'edge' | 'fill',
  width: 'edgeHalf' | 'fillHalf',
) => {
  const half = style[width];
  ctx.fillStyle = style[color];
  ctx.beginPath();
  // Против часовой, как и полосы: при заливке перекрытия складываются,
  // а не вычитаются.
  ctx.arc(16, 16, half, 0, Math.PI * 2, true);
  for (const side of sides) {
    band(ctx, side, half, (half + side.next[width]) / 2);
  }
  ctx.fill();
  for (const side of sides) {
    if (side.next[color] === style[color]) continue;
    // На общей границе оба тайла дают один цвет — середину градиента.
    const gradient = ctx.createLinearGradient(
      16,
      16,
      16 + side.dx * 32,
      16 + side.dy * 32,
    );
    gradient.addColorStop(0.15, style[color]);
    gradient.addColorStop(0.85, side.next[color]);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    band(ctx, side, half, (half + side.next[width]) / 2);
    ctx.fill();
  }
};

/**
 * Рисует дорогу на клетке по виду местности: грунтовка на поле,
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
  layer(ctx, sides, style, 'edge', 'edgeHalf');
  layer(ctx, sides, style, 'fill', 'fillHalf');

  if (style.planks) {
    ctx.strokeStyle = '#776d4d';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const { dx, dy, next } of sides) {
      for (let t = style.fillHalf + 1; t < 16; t += PLANK_STEP) {
        const cx = 16 + dx * t;
        const cy = 16 + dy * t;
        const half =
          style.fillHalf + ((next.fillHalf - style.fillHalf) * t) / 32;
        ctx.moveTo(cx - dy * half, cy + dx * half);
        ctx.lineTo(cx + dy * half, cy - dx * half);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
};
