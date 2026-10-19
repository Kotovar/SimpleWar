import type { BuildingType, ParticipantId, Unit } from '@shared/config';
import { findCheapestPaths } from '@shared/lib';
import { getBuildPlacements } from '@features/build';
import {
  createUnitMovementGrid,
  TURN_UNKNOWN_COST,
} from '@features/pathfinding';

/**
 * Кандидаты под стройку, до которых рабочий дойдёт: местность подходит по
 * знаниям участника, а рядом есть клетка, достижимая по известной карте
 * (неизвестное — как у приказа на ход). Проход не проверяется — его для
 * клетки под курсором проверяет `getPlacementRejection`.
 */
export const getReachableBuildPlacements = (
  worker: Unit,
  actor: ParticipantId,
  buildingType: BuildingType,
) => {
  const grid = createUnitMovementGrid(worker, actor, TURN_UNKNOWN_COST);
  const height = grid.length;
  const { cost, width } = findCheapestPaths(grid, worker);
  // ponytail: достижимость без транзита через своих и занятости соседа —
  // точный маршрут проверит приказ; подсветка лишь отсекает недостижимое.
  const reachable = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && cost.has(y * width + x);
  return getBuildPlacements(worker, actor, buildingType).filter(({ x, y }) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && reachable(x + dx, y + dy)) return true;
    return false;
  });
};
