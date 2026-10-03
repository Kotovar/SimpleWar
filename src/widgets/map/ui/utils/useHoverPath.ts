import { useMemo } from 'react';
import type { Owner, Position, Unit } from '@shared/config';
import type { Selection } from '@features/selection';
import {
  countRouteTurns,
  createLandingCheck,
  createUnitMovementGrid,
  getPath,
  TURN_UNKNOWN_COST,
} from '@features/pathfinding';

/**
 * Маршрут выбранного своего юнита до клетки под курсором — по известной
 * карте, как и сам приказ: скрытые юниты и рельеф маршрут не выдают.
 * Далёкая и неизвестная клетка тоже получает полный путь с числом ходов.
 *
 * @param hover - Клетка под курсором.
 * @param selection - Текущий выбор.
 * @param units - Юниты сцены.
 * @param humanId - Участник за этим экраном.
 * @returns Путь с ценой и ходом прибытия или `null`, если показывать нечего.
 */
export const useHoverPath = (
  hover: Position | null,
  selection: Selection,
  units: Record<string, Unit>,
  humanId: Owner | null,
) =>
  useMemo(() => {
    if (!hover || !humanId || selection?.kind !== 'unit') return null;
    const unit = units[selection.id];
    if (unit?.owner !== humanId || !createLandingCheck(humanId)(hover)) {
      return null;
    }

    const costs = createUnitMovementGrid(unit, humanId, TURN_UNKNOWN_COST);
    const route = getPath(unit, hover, costs);
    const turns = countRouteTurns(
      route.path,
      costs,
      unit.movePoints,
      unit.maxMovePoints,
    );
    return route.path.length > 1 && turns !== Infinity
      ? { ...route, turns }
      : null;
  }, [hover, humanId, selection, units]);
