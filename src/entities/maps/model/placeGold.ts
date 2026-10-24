import type { Cell } from '@shared/config';

/** Количество клеток карты на одну клетку золота. */
const GOLD_DENSITY = 50;

/** Минимальное количество золота даже на самой маленькой карте. */
const MIN_GOLD = 8;

/** Максимальное количество золота. */
const MAX_GOLD = 20;

/** Число попыток найти место на каждую симметричную группу клеток золота. */
const GOLD_ATTEMPTS_PER_GROUP = 50;

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
 * Пробует превратить симметричную группу проходимых клеток в золото.
 *
 * Группа откатывается, если после неё у какой-то клетки золота рядом
 * не останется травы: шахту строит рабочий с соседней клетки.
 *
 * @param grid - Клетки карты; изменяются на месте.
 * @param cells - Две или четыре зеркальные клетки.
 * @returns `true`, если группа поставлена.
 */
const tryPlaceGroup = (grid: Cell[][], cells: Cell[]): boolean => {
  if (
    new Set(cells).size !== cells.length ||
    cells.some(cell => !cell.isWalkable)
  )
    return false;

  const oldTypes = cells.map(cell => cell.type);
  for (const cell of cells) cell.type = 'gold';
  const affected = cells.flatMap(c => getSurroundings(grid, c));
  if (!affected.every(c => isMineable(grid, c))) {
    cells.forEach((cell, index) => {
      cell.type = oldTypes[index];
    });
    return false;
  }

  for (const cell of cells) cell.isWalkable = false;
  return true;
};

/**
 * Расставляет золото симметричными парами или четвёрками клеток.
 *
 * Группы распределяются по кластерам {@link GOLD_CENTERS} и ставятся только
 * на проходимые клетки. Если места не хватает, золота будет меньше целевого количества.
 *
 * @param grid - Клетки карты; изменяются на месте.
 * @param random - Генератор случайных чисел.
 * @param fourCorners - Отражать золото по обеим осям вместо центральной симметрии.
 */
export const placeGold = (
  grid: Cell[][],
  random: () => number,
  fourCorners = false,
) => {
  const height = grid.length;
  const width = grid[0].length;
  const goldGroups = Math.floor(
    Math.max(MIN_GOLD, Math.min(MAX_GOLD, (width * height) / GOLD_DENSITY)) /
      (fourCorners ? 4 : 2),
  );
  const radius = Math.floor(Math.min(width, height) / 5);
  const offset = () => Math.floor(random() * (radius * 2 + 1)) - radius;
  let placedGroups = 0;
  const richClusters = new Set<number>();

  for (
    let attempt = 0;
    placedGroups < goldGroups && attempt < goldGroups * GOLD_ATTEMPTS_PER_GROUP;
    attempt++
  ) {
    const center = GOLD_CENTERS[attempt % GOLD_CENTERS.length];
    const x = Math.floor(width * center.x) + offset();
    const y = Math.floor(height * center.y) + offset();
    const cell = grid[y]?.[x];
    const mirror = grid[height - 1 - y]?.[width - 1 - x];

    if (!cell || !mirror) continue;
    const cells = [cell, mirror];
    if (fourCorners)
      cells.push(grid[y][width - 1 - x], grid[height - 1 - y][x]);
    if (tryPlaceGroup(grid, cells)) {
      // На 3–4 стороны первые два центра — отражения одного кластера.
      const cluster =
        fourCorners && attempt % GOLD_CENTERS.length !== 2
          ? 0
          : attempt % GOLD_CENTERS.length;
      if (!richClusters.has(cluster)) {
        cells.forEach(cell => {
          cell.rich = true;
        });
        richClusters.add(cluster);
      }
      placedGroups++;
    }
  }
};
