import type { Cell, Position } from '@shared/config';
import { isBuildableTerrain } from '@shared/lib';
import { isCellOccupied } from './isCellOccupied';

/**
 * Возвращает незанятые соседние клетки, включая диагональные.
 *
 * @param grid - Клетки карты.
 * @param centerX - Столбец центральной клетки.
 * @param centerY - Строка центральной клетки.
 * @param cellType - Местность, которую требует здание или найм (холм
 *   подходит вместо поля); без неё местность не проверяется.
 * @returns Координаты подходящих клеток в пределах карты.
 */
export const getCellsAround = (
  grid: Cell[][],
  centerX: number,
  centerY: number,
  cellType?: Cell['type'],
): Position[] => {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const result: Position[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      const x = centerX + dx;
      const y = centerY + dy;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      if (isCellOccupied(x, y)) continue;

      const cell = grid[y][x];

      if (cellType !== undefined && !isBuildableTerrain(cellType, cell.type)) {
        continue;
      }

      result.push({ x, y });
    }
  }

  return result;
};
