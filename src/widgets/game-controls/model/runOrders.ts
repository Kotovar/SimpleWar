import type { ParticipantId } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useSettingsStore } from '@entities/settings';
import { executeOrders, useMovementStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';

/**
 * Исполняет приказы «Идти в точку» на оставшиеся очки. Остановившийся
 * приказ возвращает управление: юнит выбран, камера на нём, причина —
 * в карточке.
 *
 * @param clearInteraction - Сброс выбора и подсветки перед выбором юнита.
 * @returns Остановился ли хоть один приказ.
 */
export const runOrders = (
  humanId: ParticipantId | null,
  clearInteraction: () => void,
) => {
  if (!humanId) return false;
  const [stopped] = executeOrders(humanId);
  const unit = stopped && useUnitsStore.getState().units[stopped];
  if (!unit) return false;
  clearInteraction();
  useSelectionStore.getState().selectUnit(unit.id);
  useMovementStore.getState().calculateActionHighlights(unit.id);
  useSettingsStore.getState().centerOn(unit.x + 0.5, unit.y + 0.5);
  return true;
};
