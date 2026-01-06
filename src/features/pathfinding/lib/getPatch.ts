import PF from 'pathfinding';
import type { Position } from '@shared/config';

export const getPath = (
  firstPosition: Position,
  lastPosition: Position,
  pfGrid: PF.Grid,
) => {
  const { x: startX, y: startY } = firstPosition;
  const { x: endX, y: endY } = lastPosition;

  const wasStartWalkable = pfGrid.isWalkableAt(startX, startY);
  const wasEndWalkable = pfGrid.isWalkableAt(endX, endY);

  pfGrid.setWalkableAt(startX, startY, true);
  pfGrid.setWalkableAt(endX, endY, true);

  const finder = new PF.AStarFinder();
  const path = finder.findPath(startX, startY, endX, endY, pfGrid);

  pfGrid.setWalkableAt(startX, startY, wasStartWalkable);
  pfGrid.setWalkableAt(endX, endY, wasEndWalkable);

  return path;
};
