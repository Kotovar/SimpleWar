import type { ParticipantId, Position, Unit } from '@shared/config';
import { findUnitRoute } from './findUnitRoute';

/**
 * Маршрут юнита до клетки по известной участнику карте — те же цены, что
 * у приказа на ход, — и ход прибытия (`1` — этот).
 *
 * @returns Путь, цена, ходы и `firstStop` — цена до первой свободной
 * клетки (шаги через своих — транзит) — либо `null`: на клетке нельзя
 * остановиться, пути нет или нет пути без отрезка транзита дороже полного
 * запаса очков.
 */
export const getRoutePreview = (
  unit: Unit,
  actor: ParticipantId,
  target: Position,
) => {
  const { path, cost, turns, costs, canLand } = findUnitRoute(
    unit,
    actor,
    target,
  );
  if (!canLand(target) || path.length < 2 || turns === Infinity) return null;
  let firstStop = 0;
  for (const cell of path.slice(1)) {
    firstStop += costs[cell.y][cell.x];
    if (canLand(cell)) break;
  }
  return { path, cost, turns, firstStop };
};
