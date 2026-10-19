import type {
  ParticipantId,
  ProductionBuilding,
  UnitType,
} from '@shared/config';
import { reject } from '@shared/lib';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { createUnit } from '@entities/units';
import { runCommand } from '@entities/journals';
import { getCellsAround, getRoutePreview } from '@features/pathfinding';
import { spawn } from '@features/spawn';

/** Найм у точки сбора: свободный сосед с самым дешёвым маршрутом по знаниям стороны. */
export const spawnAtRallyPoint = (
  actor: ParticipantId,
  building: ProductionBuilding,
  unitType: UnitType,
) => {
  const target = building.rallyPoint;
  const unit = createUnit(unitType, building.x, building.y, actor, true);
  const candidates =
    target && unit
      ? getCellsAround(
          useMapStore.getState().grid,
          building.x,
          building.y,
          'grass',
        )
          .map(cell => ({
            ...cell,
            cost:
              cell.x === target.x && cell.y === target.y
                ? 0
                : (getRoutePreview({ ...unit, ...cell }, actor, target)?.cost ??
                  Infinity),
            distance: Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y),
          }))
          .sort(
            (a, b) =>
              a.cost - b.cost ||
              a.distance - b.distance ||
              a.y - b.y ||
              a.x - b.x,
          )
      : [];
  const cell = candidates[0];
  if (!cell)
    return runCommand(
      { type: 'spawn', actor, details: { buildingId: building.id, unitType } },
      useGameLoopStore.getState().currentTurn,
      () => reject(getTurnRejection(actor) ?? (target ? 'occupied' : 'target')),
    );
  // Если до цели пока нет пути, найм остаётся допустимым: C4 объяснит остановку.
  return spawn({
    actor,
    buildingId: building.id,
    unitType,
    x: cell.x,
    y: cell.y,
  });
};
