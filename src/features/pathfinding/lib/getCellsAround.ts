import type { Position } from '@shared/config';
import type { Cell } from '@shared/config';
import { isCellOccupied } from './isCellOccupied';

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

      if (cellType !== undefined && cell.type !== cellType) continue;

      result.push({ x, y });
    }
  }

  return result;
};
