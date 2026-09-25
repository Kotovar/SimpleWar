import type { Cell } from '@shared/config';

/** Количество клеток карты на одну клетку золота. */
const GOLD_DENSITY = 50;

/** Минимальное количество золота даже на самой маленькой карте. */
const MIN_GOLD = 8;

/** Максимальное количество золота. */
const MAX_GOLD = 20;

/** Число попыток найти место на каждую пару клеток золота. */
const GOLD_ATTEMPTS_PER_PAIR = 50;

/**
 * Центры кластеров золота в долях ширины и высоты карты.
 * Каждый кластер зеркалится относительно центра карты.
 */
const GOLD_CENTERS = [
  { x: 0.25, y: 0.25 },
  { x: 0.25, y: 0.75 },
  { x: 0.5, y: 0.5 },
];

/**
 * Возвращает клетку и её соседей по восьми направлениям внутри карты.
 *
 * @param grid - Клетки карты.
 * @param cell - Центральная клетка.
 * @returns Клетки квадрата 3 × 3 вокруг центра.
 */
const getSurroundings = (grid: Cell[][], { x, y }: Cell): Cell[] =>
  [-1, 0, 1].flatMap(dy =>
    [-1, 0, 1].flatMap(dx => grid[y + dy]?.[x + dx] ?? []),
  );

/**
 * Проверяет, что к клетке золота может подойти рабочий.
 *
 * @param grid - Клетки карты.
 * @param cell - Проверяемая клетка.
 * @returns `true` для клетки не с золотом или золота с травой по соседству.
 */
const isMineable = (grid: Cell[][], cell: Cell): boolean =>
  cell.type !== 'gold' ||
  getSurroundings(grid, cell).some(({ type }) => type === 'grass');

/**
 * Пробует превратить траву и зеркальную ей клетку в золото.
 *
 * Пара откатывается, если после неё у какой-то клетки золота рядом
 * не останется травы: шахту строит рабочий с соседней клетки.
 *
 * @param grid - Клетки карты; изменяются на месте.
 * @param cell - Клетка пары.
 * @param mirror - Клетка, зеркальная `cell` относительно центра карты.
 * @returns `true`, если пара поставлена.
 */
const tryPlacePair = (grid: Cell[][], cell: Cell, mirror: Cell): boolean => {
  if (cell === mirror || cell.type !== 'grass' || mirror.type !== 'grass')
    return false;

  cell.type = mirror.type = 'gold';
  const affected = [cell, mirror].flatMap(c => getSurroundings(grid, c));
  if (!affected.every(c => isMineable(grid, c))) {
    cell.type = mirror.type = 'grass';
    return false;
  }

  cell.isWalkable = mirror.isWalkable = false;
  return true;
};

/**
 * Расставляет золото парами клеток, симметричными относительно центра карты.
 *
 * Пары распределяются по кластерам {@link GOLD_CENTERS} и ставятся только
 * на траву. Если места не хватает, золота будет меньше целевого количества.
 *
 * @param grid - Клетки карты; изменяются на месте.
 * @param random - Генератор случайных чисел.
 */
export const placeGold = (grid: Cell[][], random: () => number) => {
  const height = grid.length;
  const width = grid[0].length;
  const goldPairs = Math.floor(
    Math.max(MIN_GOLD, Math.min(MAX_GOLD, (width * height) / GOLD_DENSITY)) / 2,
  );
  const radius = Math.floor(Math.min(width, height) / 5);
  const offset = () => Math.floor(random() * (radius * 2 + 1)) - radius;
  let placedPairs = 0;

  for (
    let attempt = 0;
    placedPairs < goldPairs && attempt < goldPairs * GOLD_ATTEMPTS_PER_PAIR;
    attempt++
  ) {
    const center = GOLD_CENTERS[attempt % GOLD_CENTERS.length];
    const x = Math.floor(width * center.x) + offset();
    const y = Math.floor(height * center.y) + offset();
    const cell = grid[y]?.[x];
    const mirror = grid[height - 1 - y]?.[width - 1 - x];

    if (cell && mirror && tryPlacePair(grid, cell, mirror)) placedPairs++;
  }
};
