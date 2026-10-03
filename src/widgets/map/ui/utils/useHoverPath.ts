import { useMemo } from 'react';
import type { Owner, Position, Unit } from '@shared/config';
import type { Selection } from '@features/selection';
import { getOrderRoutePreview, getRoutePreview } from '@features/pathfinding';

/**
 * Маршрут выбранного своего юнита — по известной карте, как и сам приказ:
 * скрытые юниты и рельеф маршрут не выдают. Цель по приоритету: отмеченная
 * первым кликом, клетка под курсором, цель приказа «Идти в точку».
 * Далёкая и неизвестная клетка тоже получает полный путь с числом ходов.
 *
 * @param hover - Клетка под курсором.
 * @param selection - Текущий выбор.
 * @param units - Юниты сцены.
 * @param humanId - Участник за этим экраном.
 * @param planned - Цель, ждущая подтверждения вторым кликом; чужая
 *   отметка (другого юнита) не показывается.
 * @returns Путь с ценой и ходом прибытия или `null`, если показывать нечего.
 */
export const useHoverPath = (
  hover: Position | null,
  selection: Selection,
  units: Record<string, Unit>,
  humanId: Owner | null,
  planned: (Position & { unitId: string }) | null = null,
) =>
  useMemo(() => {
    if (!humanId || selection?.kind !== 'unit') return null;
    const unit = units[selection.id];
    if (unit?.owner !== humanId) return null;
    const mark = planned?.unitId === unit.id ? planned : null;
    if (mark) return getRoutePreview(unit, humanId, mark);
    if (unit.order && !unit.order.stopped && unit.order.type !== 'goto')
      return getOrderRoutePreview(unit, humanId, unit.order);
    const route = hover && getRoutePreview(unit, humanId, hover);
    if (route) return route;
    return unit.order ? getOrderRoutePreview(unit, humanId, unit.order) : null;
  }, [hover, humanId, planned, selection, units]);
