import { assignWorker } from '@features/workers';
import { build } from '@features/build';
import type { ParticipantId } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useSettingsStore } from '@entities/settings';
import { executeOrders, useMovementStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';

/**
 * Исполняет приказы движения, стройки и работы на оставшиеся очки. Остановившийся
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
  const [stopped] = executeOrders(humanId, unit =>
    unit.order.type === 'work'
      ? assignWorker({
          actor: humanId,
          workerId: unit.id,
          buildingId: unit.order.buildingId,
        })
      : build({ actor: humanId, workerId: unit.id, ...unit.order }),
  );
  const unit = stopped && useUnitsStore.getState().units[stopped];
  if (!unit) return false;
  clearInteraction();
  useSelectionStore.getState().selectUnit(unit.id);
  useMovementStore.getState().calculateActionHighlights(unit.id);
  useSettingsStore.getState().centerOn(unit.x + 0.5, unit.y + 0.5, true);
  return true;
};
