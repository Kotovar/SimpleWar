import { useMemo } from 'react';
import type { Owner, Position, Unit, UnitOrder } from '@shared/config';
import type { Selection } from '@features/selection';
import { getOrderRoutePreview, getRoutePreview } from '@features/pathfinding';

/**
 * Путь приказа для показа: к стройке и работе — до самого здания, а не до
 * клетки рядом, где рабочий остановится. Рядом с целью — один шаг к ней.
 */
const getOrderPath = (unit: Unit, humanId: Owner, order: UnitOrder) => {
  const route = getOrderRoutePreview(unit, humanId, order);
  if (order.type === 'goto' || order.type === 'explore')
    return route && { ...route, goal: true };
  const target = { x: order.x, y: order.y };
  if (route) return { ...route, path: [...route.path, target] };
  const near = Math.max(Math.abs(unit.x - order.x), Math.abs(unit.y - order.y));
  return near === 1 ? { path: [unit, target], cost: 0, turns: 1 } : null;
};

/**
 * Маршрут выбранного своего юнита — по известной карте, как и сам приказ:
 * скрытые юниты и рельеф маршрут не выдают. Цель по приоритету: отмеченная
 * первым кликом, приказ под курсором, активный приказ стройки или работы,
 * клетка под курсором, цель приказа «Идти в точку».
 * Далёкая и неизвестная клетка тоже получает полный путь с числом ходов.
 *
 * @param hover - Клетка под курсором.
 * @param selection - Текущий выбор.
 * @param units - Юниты сцены.
 * @param humanId - Участник за этим экраном.
 * @param planned - Цель, ждущая подтверждения вторым кликом; чужая
 *   отметка (другого юнита) не показывается.
 * @param hoverOrder - Приказ, который даст клик по клетке под курсором
 *   (стройка в режиме выбора места, работа в своём здании); `false` —
 *   клик откажет, путь не показывается.
 * @returns Путь с ценой и ходом прибытия или `null`, если показывать нечего.
 */
export const useHoverPath = (
  hover: Position | null,
  selection: Selection,
  units: Record<string, Unit>,
  humanId: Owner | null,
  planned: (Position & { unitId: string }) | null = null,
  hoverOrder: UnitOrder | false | null = null,
) =>
  useMemo(() => {
    if (!humanId || selection?.kind !== 'unit') return null;
    const unit = units[selection.id];
    if (unit?.owner !== humanId) return null;
    const mark = planned?.unitId === unit.id ? planned : null;
    const toCell = (target: Position) => {
      const route = getRoutePreview(unit, humanId, target);
      return route && { ...route, goal: true };
    };
    if (mark) return toCell(mark);
    if (hoverOrder === false) return null;
    if (hoverOrder) return getOrderPath(unit, humanId, hoverOrder);
    if (unit.order && !unit.order.stopped && unit.order.type !== 'goto')
      return getOrderPath(unit, humanId, unit.order);
    const route = hover && toCell(hover);
    if (route) return route;
    return unit.order ? getOrderPath(unit, humanId, unit.order) : null;
  }, [hover, hoverOrder, humanId, planned, selection, units]);
