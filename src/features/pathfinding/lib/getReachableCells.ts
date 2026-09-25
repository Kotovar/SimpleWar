import PF from 'pathfinding';
import type { Position } from '@shared/config';

/**
 * Обходит клетки, достижимые за указанное число шагов.
 *
 * @param pfGrid - Сетка препятствий.
 * @param startX - Столбец стартовой клетки.
 * @param startY - Строка стартовой клетки.
 * @param maxSteps - Максимальное число переходов между клетками.
 * @param allowDiagonal - Разрешены ли диагональные переходы.
 * @returns Достижимые клетки без стартовой.
 */
export const getReachableCells = (
  pfGrid: PF.Grid,
  startX: number,
  startY: number,
  maxSteps: number,
  allowDiagonal = false,
): Position[] => {
  if (
    !Number.isInteger(startX) ||
    !Number.isInteger(startY) ||
    !Number.isInteger(maxSteps) ||
    !pfGrid.isInside(startX, startY) ||
    maxSteps <= 0
  )
    return [];

  const reachable: Position[] = [];
  const queue: { x: number; y: number; steps: number }[] = [
    { x: startX, y: startY, steps: 0 },
  ];
  const visited = new Set([`${startX},${startY}`]);

  const diagonalMovement = allowDiagonal
    ? PF.DiagonalMovement.Always
    : PF.DiagonalMovement.Never;

  // Читаем очередь по индексу: shift() сдвигал бы весь массив на каждом шаге.
  for (let index = 0; index < queue.length; index++) {
    const curr = queue[index];
    const { x, y, steps } = curr;

    if (steps > 0) {
      reachable.push({ x, y });
    }

    if (steps >= maxSteps) continue;

    const node = pfGrid.getNodeAt(x, y);
    const neighbors = pfGrid.getNeighbors(node, diagonalMovement);

    for (const neighbor of neighbors) {
      // В очередь клетка попадает один раз, по кратчайшему пути в ширину.
      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({
        x: neighbor.x,
        y: neighbor.y,
        steps: steps + 1,
      });
    }
  }

  return reachable;
};
