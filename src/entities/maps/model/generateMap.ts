import type { Cell } from '@shared/config';
import { createRandom, isValidSeed } from './createRandom';
import { generateTerrain } from './generateTerrain';
import { placeGold } from './placeGold';

/**
 * Проверяет параметры генерации карты.
 *
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @param seed - Зерно генерации.
 * @throws {RangeError} Если размеры не положительные целые или сид недопустим.
 */
const assertMapParams = (width: number, height: number, seed?: number) => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError(
      'Размеры карты должны быть положительными целыми числами.',
    );
  }
  if (seed !== undefined && !isValidSeed(seed)) {
    throw new RangeError('Сид должен быть целым неотрицательным числом.');
  }
};

/**
 * Генерирует воспроизводимую по сиду карту с рельефом и золотом.
 *
 * Карта симметрична относительно центра, как и стартовые базы: рельеф
 * строится {@link generateTerrain}, золото расставляет {@link placeGold}.
 *
 * @param width - Ширина карты в клетках.
 * @param height - Высота карты в клетках.
 * @param seed - Зерно генерации; без него карта случайна.
 * @returns Клетки карты, индексируемые как `grid[y][x]`.
 * @throws {RangeError} Если размеры не положительные целые или сид недопустим.
 */
export const generateMap = (
  width: number,
  height: number,
  seed?: number,
): Cell[][] => {
  assertMapParams(width, height, seed);

  const random = createRandom(seed);
  const grid = generateTerrain(width, height, random);
  placeGold(grid, random);

  return grid;
};
