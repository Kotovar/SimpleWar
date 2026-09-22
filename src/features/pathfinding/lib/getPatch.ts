import PF from 'pathfinding';
import type { Position } from '@shared/config';

export const getPath = (
  firstPosition: Position,
  lastPosition: Position,
  pfGrid: PF.Grid,
) => {
  const { x: startX, y: startY } = firstPosition;
  const { x: endX, y: endY } = lastPosition;

  if (
    ![startX, startY, endX, endY].every(Number.isInteger) ||
    !pfGrid.isInside(startX, startY) ||
    !pfGrid.isInside(endX, endY) ||
    !pfGrid.isWalkableAt(endX, endY)
  )
    return [];

  // Pathfinding stores visited nodes on the grid; each search needs a fresh copy.
  const searchGrid = pfGrid.clone();
  searchGrid.setWalkableAt(startX, startY, true);

  const finder = new PF.AStarFinder();
  return finder.findPath(startX, startY, endX, endY, searchGrid);
};
