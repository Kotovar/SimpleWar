import { useMemo } from 'react';
import type { Owner, Position, Unit } from '@shared/config';
import type { Selection } from '@features/selection';
import {
  createKnownMovementGrid,
  getPath,
  TURN_UNKNOWN_COST,
} from '@features/pathfinding';

/**
 * Маршрут выбранного своего юнита до клетки под курсором — по известной
 * карте, как и сам приказ: скрытые юниты и рельеф маршрут не выдают.
 *
 * @param hover - Клетка под курсором.
 * @param selection - Текущий выбор.
 * @param units - Юниты сцены.
 * @param reachableCells - Клетки движения выбранного юнита.
 * @param humanId - Участник за этим экраном.
 * @returns Путь с ценой или `null`, если показывать нечего.
 */
export const useHoverPath = (
  hover: Position | null,
  selection: Selection,
  units: Record<string, Unit>,
  reachableCells: Position[] | null,
  humanId: Owner | null,
) =>
  useMemo(() => {
    if (!hover || !humanId || selection?.kind !== 'unit') return null;
    const unit = units[selection.id];
    const isReachable = reachableCells?.some(
      cell => cell.x === hover.x && cell.y === hover.y,
    );
    if (unit?.owner !== humanId || !isReachable) return null;

    const route = getPath(
      unit,
      hover,
      createKnownMovementGrid(humanId, TURN_UNKNOWN_COST),
    );
    return route.path.length > 1 ? route : null;
  }, [hover, humanId, reachableCells, selection, units]);
