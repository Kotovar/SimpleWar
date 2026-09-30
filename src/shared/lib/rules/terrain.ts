import {
  MOVE_COST,
  type Cell,
  type CellType,
  type Position,
} from '@shared/config';

/**
 * Цены входа в клетки, `grid[y][x]`; `0` — войти нельзя
 * (местность или занятая клетка).
 */
export type MovementGrid = number[][];

/**
 * Цена входа наземного юнита в клетку.
 *
 * @param cell - Клетка карты.
 * @returns Очки движения за вход или `0` для непроходимой местности.
 */
export const getMoveCost = ({
  type,
  isWalkable,
}: Pick<Cell, 'type' | 'isWalkable'>) =>
  isWalkable ? (MOVE_COST[type] ?? 0) : 0;

/**
 * Можно ли поставить здание или нанять юнита на местность. Холм подходит
 * везде, где нужно поле; болото — нигде.
 *
 * @param required - Местность, которую требует здание; по умолчанию поле.
 * @param type - Местность клетки.
 * @returns `true`, если местность подходит.
 */
export const isBuildableTerrain = (
  required: CellType = 'grass',
  type: CellType,
) => type === required || (required === 'grass' && type === 'hill');

/**
 * Самые дешёвые пути от клетки по сетке цен (Дейкстра с корзинами:
 * сетка прямоугольная, цены целые неотрицательные, `0` — войти нельзя).
 * Стартовая клетка может быть занята. Поиск идёт по типизированным
 * массивам, результат — в `Map`.
 *
 * @param costs - Цены входа в клетки.
 * @param start - Стартовая клетка.
 * @param maxCost - Предел цены пути; дороже клетки не обходятся.
 * @returns Цена пути до каждой достигнутой клетки и предыдущая клетка
 * пути; ключ клетки — `y * width + x`.
 */
export const findCheapestPaths = (
  costs: MovementGrid,
  start: Position,
  maxCost = Infinity,
) => {
  const width = costs[0]?.length ?? 0;
  const height = costs.length;
  const cost = new Map<number, number>();
  const previous = new Map<number, number>();
  const inside =
    Number.isInteger(start.x) &&
    Number.isInteger(start.y) &&
    costs[start.y]?.[start.x] !== undefined;
  if (!inside) return { cost, previous, width };

  // -1 — клетка не достигнута.
  const best = new Int32Array(width * height).fill(-1);
  const from = new Int32Array(width * height).fill(-1);
  const startKey = start.y * width + start.x;
  best[startKey] = 0;
  const buckets: number[][] = [[startKey]];
  // Порядок первого обнаружения клеток: так же, как вставка в `Map`.
  const found = [startKey];

  const relax = (key: number, current: number, nx: number, ny: number) => {
    const enter = costs[ny][nx];
    if (!enter) return;
    const next = current + enter;
    const nextKey = ny * width + nx;
    if (next > maxCost || (best[nextKey] !== -1 && next >= best[nextKey])) {
      return;
    }
    if (best[nextKey] === -1) found.push(nextKey);
    best[nextKey] = next;
    from[nextKey] = key;
    (buckets[next] ??= []).push(nextKey);
  };

  for (let current = 0; current < buckets.length; current++) {
    for (const key of buckets[current] ?? []) {
      if (best[key] !== current) continue;
      const x = key % width;
      const y = (key - x) / width;
      if (x + 1 < width) relax(key, current, x + 1, y);
      if (x > 0) relax(key, current, x - 1, y);
      if (y + 1 < height) relax(key, current, x, y + 1);
      if (y > 0) relax(key, current, x, y - 1);
    }
  }

  for (const key of found) {
    cost.set(key, best[key]);
    if (from[key] !== -1) previous.set(key, from[key]);
  }

  return { cost, previous, width };
};
