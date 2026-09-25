import PF from 'pathfinding';
import type { Position } from '@shared/config';

/**
 * Находит кратчайший путь без изменения исходной сетки.
 *
 * @param firstPosition - Исходная клетка, даже если она занята юнитом.
 * @param lastPosition - Свободная целевая клетка.
 * @param pfGrid - Сетка препятствий.
 * @returns Клетки пути от начала до цели или пустой список.
 */
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

  // Поиск помечает посещённые узлы, поэтому для каждого вызова нужна копия сетки.
  const searchGrid = pfGrid.clone();
  searchGrid.setWalkableAt(startX, startY, true);

  const finder = new PF.AStarFinder();
  return finder.findPath(startX, startY, endX, endY, searchGrid);
};
