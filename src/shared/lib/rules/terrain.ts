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

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Самые дешёвые пути от клетки по сетке цен (Дейкстра с корзинами:
 * цены целые и положительные). Стартовая клетка может быть занята.
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
  const cost = new Map<number, number>();
  const previous = new Map<number, number>();
  const inside = (x: number, y: number) =>
    Number.isInteger(x) && Number.isInteger(y) && costs[y]?.[x] !== undefined;
  if (!inside(start.x, start.y)) return { cost, previous, width };

  const startKey = start.y * width + start.x;
  cost.set(startKey, 0);
  const buckets: number[][] = [[startKey]];

  for (let current = 0; current < buckets.length; current++) {
    for (const key of buckets[current] ?? []) {
      if (cost.get(key) !== current) continue;
      const x = key % width;
      const y = (key - x) / width;

      for (const [dx, dy] of STEPS) {
        const enter = costs[y + dy]?.[x + dx];
        if (!enter) continue;
        const next = current + enter;
        const nextKey = (y + dy) * width + x + dx;
        if (next > maxCost || next >= (cost.get(nextKey) ?? Infinity)) {
          continue;
        }
        cost.set(nextKey, next);
        previous.set(nextKey, key);
        (buckets[next] ??= []).push(nextKey);
      }
    }
  }

  return { cost, previous, width };
};
