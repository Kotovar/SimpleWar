import { SELECTED, type Position } from '@shared/config';
import { pluralRu } from '@shared/lib';

/**
 * Маршрут и его цена в очках движения, как их отдаёт `getPath`;
 * `turns` — на каком ходу юнит дойдёт (`1` — в этот).
 */
export type MovePath = { path: Position[]; cost: number; turns?: number };

/**
 * Рисует маршрут до клетки под курсором и подпись в середине пути, сбоку
 * от линии: цену, если дойдёт в этот ход, иначе число ходов.
 *
 * @param route - Клетки маршрута от текущей позиции до цели, цена и ходы.
 */
export const drawPath = (
  ctx: CanvasRenderingContext2D,
  { path, cost, turns = 1 }: MovePath,
  cellSize: number,
) => {
  if (path.length < 2) return;

  const scale = cellSize / 32;
  const center = ({ x, y }: Position) => [
    (x + 0.5) * cellSize,
    (y + 0.5) * cellSize,
  ];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((cell, index) => {
    const [x, y] = center(cell);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.5)';
  ctx.lineWidth = 4 * scale;
  ctx.stroke();
  ctx.strokeStyle = SELECTED.freeOutline;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([4 * scale, 4 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Столько очков движения спишется: холм и болото стоят дороже поля.
  // Далёкая цель — сколько ходов идти, считая текущий. Здание вплотную
  // (цена 0) подписи не требует.
  if (turns <= 1 && cost === 0) {
    ctx.restore();
    return;
  }
  const text =
    turns > 1
      ? `${turns} ${pluralRu(turns, ['ход', 'хода', 'ходов'])}`
      : String(cost);
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = Math.max(ctx.measureText(text).width + 8 * scale, 14 * scale);
  const height = 13 * scale;
  // Видимая часть холста в координатах мира: подпись не уходит за край.
  const view = ctx.getTransform();
  const zoom = view.a || 1;
  const [labelX, labelY] = placeLabel(
    path.map(center),
    width,
    height,
    // Полуширина подложки линии и небольшой зазор.
    4 * scale,
    ctx.canvas && {
      left: -view.e / zoom,
      top: -view.f / zoom,
      right: (ctx.canvas.width - view.e) / zoom,
      bottom: (ctx.canvas.height - view.f) / zoom,
    },
  );
  ctx.beginPath();
  ctx.roundRect(
    labelX - width / 2,
    labelY - height / 2,
    width,
    height,
    6 * scale,
  );
  ctx.fillStyle = 'rgba(24, 29, 35, 0.85)';
  ctx.fill();
  ctx.strokeStyle = SELECTED.freeOutline;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();
  ctx.fillStyle = '#e8edf2';
  ctx.fillText(text, labelX, labelY + 0.5 * scale);
  ctx.restore();
};

/**
 * Центр подписи маршрута: середина длины пути, сдвинутая в сторону, где
 * плашка не задевает ни одного отрезка и видна целиком. Пробует выше,
 * справа, слева, ниже, затем те же стороны дальше от линии. Не видна
 * нигде — без пересечения линии; тесно везде — выше.
 *
 * @param points - Вершины пути в пикселях.
 * @param gap - Отступ плашки от оси линии.
 * @param bounds - Видимая область в тех же пикселях.
 * @returns Координаты центра плашки.
 */
export const placeLabel = (
  points: number[][],
  width: number,
  height: number,
  gap: number,
  bounds?: { left: number; top: number; right: number; bottom: number },
) => {
  const lengths = points
    .slice(1)
    .map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let rest = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let [midX, midY] = points[0];
  for (let i = 0; i < lengths.length; i++) {
    if (rest <= lengths[i]) {
      const t = lengths[i] ? rest / lengths[i] : 0;
      midX = points[i][0] + (points[i + 1][0] - points[i][0]) * t;
      midY = points[i][1] + (points[i + 1][1] - points[i][1]) * t;
      break;
    }
    rest -= lengths[i];
  }
  const candidates = [0, 1, 2].flatMap(far => {
    const dx = width / 2 + gap + far * width;
    const dy = height / 2 + gap + far * height * 2;
    return [
      [midX, midY - dy],
      [midX + dx, midY],
      [midX - dx, midY],
      [midX, midY + dy],
    ];
  });
  const inside = ([cx, cy]: number[]) =>
    !bounds ||
    (cx - width / 2 >= bounds.left &&
      cx + width / 2 <= bounds.right &&
      cy - height / 2 >= bounds.top &&
      cy + height / 2 <= bounds.bottom);
  // Отрезки проверяются точками через 1 px — путь короткий.
  const hits = ([cx, cy]: number[]) =>
    points.slice(1).some(([x, y], i) => {
      const [fromX, fromY] = points[i];
      const steps = Math.ceil(Math.hypot(x - fromX, y - fromY)) || 1;
      for (let step = 0; step <= steps; step++) {
        const px = fromX + ((x - fromX) * step) / steps;
        const py = fromY + ((y - fromY) * step) / steps;
        if (
          Math.abs(px - cx) < width / 2 + gap / 2 &&
          Math.abs(py - cy) < height / 2 + gap / 2
        )
          return true;
      }
      return false;
    });
  const free = candidates.filter(candidate => !hits(candidate));
  return free.find(inside) ?? free[0] ?? candidates[0];
};

/**
 * Рисует границу дальности атаки: ромб по манхэттенскому расстоянию.
 *
 * Именно контур, а не заливка клеток: подсветка движения под ним остаётся видимой.
 */
export const drawAttackRange = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  range: number,
  cellSize: number,
) => {
  if (range <= 0) return;

  const scale = cellSize / 32;
  const centerX = (cellX + 0.5) * cellSize;
  const centerY = (cellY + 0.5) * cellSize;
  const reach = (range + 0.5) * cellSize;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - reach);
  ctx.lineTo(centerX + reach, centerY);
  ctx.lineTo(centerX, centerY + reach);
  ctx.lineTo(centerX - reach, centerY);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(28, 36, 32, 0.4)';
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  ctx.strokeStyle = SELECTED.enemyOutline;
  ctx.lineWidth = 1.4 * scale;
  ctx.setLineDash([5 * scale, 4 * scale]);
  ctx.stroke();
  ctx.restore();
};
