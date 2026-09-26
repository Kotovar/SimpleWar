import type { Cell } from '@shared/config';

/**
 * Превращает в проходимую траву квадрат 3 × 3 вокруг стартовой клетки.
 *
 * @param grid - Подготавливаемая карта.
 * @param x - Столбец центра квадрата.
 * @param y - Строка центра квадрата.
 */
export const prepareStartArea = (grid: Cell[][], x: number, y: number) => {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = grid[y + dy]?.[x + dx];
      if (cell) {
        cell.type = 'grass';
        cell.isWalkable = true;
      }
    }
  }
};
