import {
  BUILDINGS_CONFIG,
  type Building,
  type BuildingType,
  type ParticipantId,
  type ResearchType,
  type Unit,
  type UnitType,
} from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { demolish, isPlacementBlocking } from '@features/build';
import { getStrikeCells } from '@features/combat';
import {
  cancelOrder,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import { cancelResearch, startResearch } from '@features/research';
import { useSelectionStore } from '@features/selection';
import { setUnitRest } from '@features/game-loop';
import {
  assignWorker,
  getClearableCells,
  repair,
  unassignWorker,
} from '@features/workers';
import type {
  ActionButton,
  SelectionActionInput,
} from '../lib/selectionActions';

/** Выбранное и сведения, по которым построены кнопки. */
export type RunContext = {
  humanId: ParticipantId | null;
  unit: Unit | null;
  building: Building | null;
  input: SelectionActionInput;
};

/** Сбросить режимы карты; `unitId` — снова показать ходы юнита. */
const resetModes = (unitId?: string) => {
  useHighlightStore.getState().resetStore();
  useMovementStore.getState().resetStore();
  useBuildingsStore.getState().clearSelectedBuildingForSpawn();
  useUnitsStore.getState().clearSelectedUnitForSpawn();
  if (unitId) useMovementStore.getState().calculateActionHighlights(unitId);
};

/**
 * Кнопки нижней панели для своего выбранного объекта и их исполнение теми
 * же командами, что у карты и ИИ. Подменю открывает панель; здесь —
 * только действия.
 *
 * @returns Кнопки и `run` — выполнить кнопку (подменю не открывает).

/**
 * Выполняет кнопку нижней панели теми же командами, что карта и ИИ.
 * Кнопки режимов (стройка, найм, расчистка, прицел) включают и выключают
 * подсветку клеток; подменю здесь не открывается.
 *
 * @param button - Нажатая кнопка; цель — в `id` после двоеточия.
 * @param context - Выбранное и сведения, по которым построены кнопки.
 */
export const runSelectionAction = (
  { id }: ActionButton,
  { humanId, unit, building, input }: RunContext,
) => {
  if (!humanId) return;
  const actor = humanId;
  const [kind, target] = id.split(':');
  switch (kind) {
    case 'cancelOrder':
      if (!unit) return;
      cancelOrder({ actor, unitId: unit.id });
      resetModes(unit.id);
      return;
    case 'skip':
    case 'sleep':
      if (!unit) return;
      setUnitRest({
        actor,
        unitId: unit.id,
        mode:
          kind === 'skip' ? 'skip' : unit.restMode === 'sleep' ? null : 'sleep',
      });
      resetModes(unit.id);
      return;
    case 'build': {
      if (!unit || !target) return;
      const type = target as BuildingType;
      const wasSelected = input.mode.building === type;
      resetModes();
      if (wasSelected) {
        useMovementStore.getState().calculateActionHighlights(unit.id);
        return;
      }
      useBuildingsStore.getState().selectBuildingForSpawn(type);
      // Клетки, где здание перекроет последний проход, не подсвечиваются.
      useHighlightStore
        .getState()
        .calculateBuildableCells(
          unit.id,
          BUILDINGS_CONFIG[type].requiredField ?? 'grass',
          cell => !isPlacementBlocking(actor, cell),
        );
      return;
    }
    case 'spawn': {
      if (!building || !target) return;
      const type = target as UnitType;
      const wasSelected = input.mode.unit === type;
      resetModes();
      if (wasSelected) return;
      useUnitsStore.getState().selectUnitForSpawn(type);
      useHighlightStore
        .getState()
        .calculateSpawnableCells(building.id, 'grass');
      return;
    }
    case 'work':
      if (!unit || !target) return;
      assignWorker({ actor, workerId: unit.id, buildingId: target });
      // Рабочий вошёл в здание: подсветка хода больше не нужна.
      resetModes();
      return;
    case 'unassign': {
      const workerId = unit?.id ?? input.workerInside?.id;
      if (!workerId) return;
      unassignWorker({ actor, workerId });
      resetModes(unit?.id);
      return;
    }
    case 'clearForest': {
      if (!unit) return;
      const wasOn = input.mode.clearing;
      resetModes(wasOn ? unit.id : undefined);
      if (!wasOn) {
        useHighlightStore
          .getState()
          .setClearableCells(getClearableCells(actor, unit));
      }
      return;
    }
    case 'repair':
      if (!unit || !target) return;
      repair({ actor, workerId: unit.id, buildingId: target });
      resetModes(unit.id);
      return;
    case 'prepareStrike': {
      if (!unit) return;
      const wasOn = input.mode.striking;
      resetModes(wasOn ? unit.id : undefined);
      if (!wasOn) {
        useHighlightStore
          .getState()
          .setStrikeCells(getStrikeCells(actor, unit));
      }
      return;
    }
    case 'research':
      if (target) startResearch({ actor, research: target as ResearchType });
      return;
    case 'cancelResearch':
      cancelResearch(actor);
      return;
    case 'pickWorker': {
      const worker = input.workerInside;
      if (!worker) return;
      resetModes();
      useSelectionStore.getState().selectUnit(worker.id);
      useMovementStore.getState().calculateActionHighlights(worker.id);
      return;
    }
    case 'demolish':
      if (!building) return;
      if (!demolish({ actor, buildingId: building.id }).ok) return;
      useSelectionStore.getState().clearSelection();
      resetModes();
      return;
  }
};
