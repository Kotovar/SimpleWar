import PF from 'pathfinding';
import type { Position } from '@shared/config';

export const getReachableCells = (
  pfGrid: PF.Grid,
  startX: number,
  startY: number,
  maxSteps: number,
  allowDiagonal = false,
): Position[] => {
  const reachable: Position[] = [];
  const queue: { x: number; y: number; steps: number }[] = [
    { x: startX, y: startY, steps: 0 },
  ];
  const visited = new Set<string>();

  const diagonalMovement = allowDiagonal
    ? PF.DiagonalMovement.Always
    : PF.DiagonalMovement.Never;

  while (queue.length) {
    const curr = queue.shift();
    if (curr === undefined) {
      continue;
    }
    const { x, y, steps } = curr;

    const key = `${x},${y}`;
    if (visited.has(key)) continue;

    visited.add(key);
    if (steps > 0) {
      reachable.push({ x, y });
    }

    if (steps >= maxSteps) continue;

    const node = pfGrid.getNodeAt(x, y);
    const neighbors = pfGrid.getNeighbors(node, diagonalMovement);

    for (const neighbor of neighbors) {
      queue.push({
        x: neighbor.x,
        y: neighbor.y,
        steps: steps + 1,
      });
    }
  }

  return reachable;
};
