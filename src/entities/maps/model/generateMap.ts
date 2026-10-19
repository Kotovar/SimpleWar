import { MAP_SIDE_LIMIT, MAX_PARTICIPANTS, type Cell } from '@shared/config';
import { createRandom, isValidSeed } from './createRandom';
import { generateTerrain } from './generateTerrain';
import { placeGold } from './placeGold';

/**
 * Проверяет параметры генерации карты.
 *
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @param seed - Зерно генерации.
 * @param participants - Число участников от двух до четырёх.
 * @throws {RangeError} Если размеры, сид или число участников недопустимы.
 */
const assertMapParams = (
  width: number,
  height: number,
  seed: number | undefined,
  participants: number,
) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAP_SIDE_LIMIT ||
    height > MAP_SIDE_LIMIT
  ) {
    throw new RangeError(
      `Размеры карты должны быть целыми числами от 1 до ${MAP_SIDE_LIMIT}.`,
    );
  }
  if (seed !== undefined && !isValidSeed(seed)) {
    throw new RangeError('Сид должен быть целым неотрицательным числом.');
  }
  if (
    !Number.isInteger(participants) ||
    participants < 2 ||
    participants > MAX_PARTICIPANTS
  ) {
    throw new RangeError('Для карты нужны от двух до четырёх участников.');
  }
};

/**
 * Генерирует воспроизводимую по сиду карту с рельефом и золотом.
 *
 * На двоих карта симметрична относительно центра, на 3–4 — по обеим осям; рельеф
 * строится {@link generateTerrain}, золото расставляет {@link placeGold}.
 *
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @param seed - Зерно генерации; без него карта случайна.
 * @param participants - Число участников: определяет симметрию карты.
 * @returns Клетки карты, индексируемые как `grid[y][x]`.
 * @throws {RangeError} Если размеры, сид или число участников недопустимы.
 */
export const generateMap = (
  width: number,
  height: number,
  seed?: number,
  participants = 2,
): Cell[][] => {
  assertMapParams(width, height, seed, participants);

  const random = createRandom(seed);
  const fourCorners = participants > 2;
  const grid = generateTerrain(width, height, random, fourCorners);
  placeGold(grid, random, fourCorners);

  return grid;
};
