import { useMemo } from 'react';
import type { Owner, Position, Unit } from '@shared/config';
import type { Selection } from '@features/selection';
import { getRoutePreview } from '@features/pathfinding';

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
    for (const target of [mark, hover, unit.order]) {
      const route = target && getRoutePreview(unit, humanId, target);
      if (route) return route;
    }
    return null;
  }, [hover, humanId, planned, selection, units]);
