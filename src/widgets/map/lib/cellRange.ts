import type { Cell } from '@shared/config';
import type { CellRange } from '@shared/lib';

/**
 * Диапазон всей карты: рисование без отсечения по окну.
 *
 * @param grid - Клетки карты.
 */
export const getFullRange = (grid: Cell[][]): CellRange => ({
  x0: 0,
  y0: 0,
  x1: grid[0]?.length ?? 0,
  y1: grid.length,
});

/**
 * Обходит только клетки диапазона; соседей по-прежнему можно брать из всей
 * карты, поэтому края силуэтов у границы окна рисуются верно.
 *
 * @param grid - Клетки карты.
 * @param range - Диапазон клеток; без него — вся карта.
 * @param visit - Действие для клетки.
 */
export const forEachCellIn = (
  grid: Cell[][],
  range: CellRange | undefined,
  visit: (cell: Cell, x: number, y: number) => void,
) => {
  const { x0, y0, x1, y1 } = range ?? getFullRange(grid);
  for (let y = y0; y < y1; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = x0; x < x1; x++) {
      const cell = row[x];
      if (cell) visit(cell, x, y);
    }
  }
};
