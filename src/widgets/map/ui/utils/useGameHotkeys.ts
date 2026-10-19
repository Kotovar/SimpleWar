import { useEffect, useRef } from 'react';
import type { Owner } from '@shared/config';
import { isTyping } from '@shared/lib';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useSelectionStore } from '@features/selection';
import {
  canUnitStep,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import {
  getNextUnit,
  hasActions,
  isIdleWorker,
  type Scene,
} from '@widgets/map/lib';

type Props = {
  scene: Scene;
  humanId: Owner | null;
  /** Камера к своей ратуше. */
  focusBase: () => void;
};

/** Открыто меню или диалог: Esc принадлежит ему, а не карте. */
const isOverlayOpen = () =>
  !!document.querySelector('details[open], dialog[open]');

/**
 * Отменяет по шагам: сначала режим (стройка, найм, расчистка, прицел,
 * отмеченная цель приказа) с возвратом обычной подсветки выбранного, затем
 * сам выбор.
 */
const cancelStep = (humanId: Owner | null) => {
  const highlight = useHighlightStore.getState();
  const movement = useMovementStore.getState();
  const { selection, clearSelection } = useSelectionStore.getState();
  const buildings = useBuildingsStore.getState();
  const units = useUnitsStore.getState();
  const inMode =
    !!buildings.selectedBuildingForSpawn ||
    !!buildings.selectedRallyBuildingId ||
    !!units.selectedUnitForSpawn ||
    !!highlight.buildableCells ||
    !!highlight.spawnableCells ||
    !!highlight.clearableCells ||
    !!highlight.strikeCells ||
    // Отметка другого юнита невидима и не считается режимом выбранного.
    (selection?.kind === 'unit' &&
      movement.plannedTarget?.unitId === selection.id);

  highlight.resetStore();
  movement.setPlannedTarget(null);
  if (inMode && selection) {
    buildings.clearSelectedBuildingForSpawn();
    units.clearSelectedUnitForSpawn();
    const entity =
      selection.kind === 'unit'
        ? units.units[selection.id]
        : selection.kind === 'building'
          ? buildings.buildings[selection.id]
          : null;
    if (entity && entity.owner === humanId) {
      useMovementStore.getState().calculateActionHighlights(entity.id);
    }
    return;
  }
  clearSelection();
  useMovementStore.getState().resetStore();
};

/**
 * Клавиши партии по физическому положению (`event.code`), поэтому работают
 * на любой раскладке: `Esc` — отмена по шагам, `Tab` — следующий юнит с
 * действиями, `.` — свободный рабочий, `H` — к ратуше. Не срабатывают при
 * вводе в поле и с Ctrl/Alt/Meta.
 *
 * @param props.scene - Видимые объекты: выбираются только свои на карте.
 * @param props.humanId - Участник за экраном.
 * @param props.focusBase - Камера к своей ратуше.
 */
export const useGameHotkeys = (props: Props) => {
  // Обработчик один на всё время: свежие данные — через ref.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const selectNext = (fits: Parameters<typeof getNextUnit>[2]) => {
      const { scene, humanId } = latest.current;
      const { selection, selectUnit } = useSelectionStore.getState();
      const own = Object.values(scene.units).filter(
        unit => unit.owner === humanId,
      );
      const next = getNextUnit(
        own,
        selection?.kind === 'unit' ? selection.id : null,
        fits,
      );
      if (!next) return;
      useHighlightStore.getState().resetStore();
      useBuildingsStore.getState().clearSelectedBuildingForSpawn();
      useUnitsStore.getState().clearSelectedUnitForSpawn();
      selectUnit(next.id);
      useMovementStore.getState().calculateActionHighlights(next.id);
      useSettingsStore.getState().centerOn(next.x + 0.5, next.y + 0.5);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTyping(event.target)) return;
      const { humanId, focusBase } = latest.current;
      const { phase, activePlayer } = useGameLoopStore.getState();
      if (phase !== 'inProgress' || !humanId) return;
      const ownTurn = activePlayer === humanId;

      switch (event.code) {
        case 'Escape':
          if (isOverlayOpen()) return;
          cancelStep(humanId);
          break;
        case 'Tab':
          // В партии Tab — только игровая клавиша: браузер не переводит
          // фокус по элементам страницы и не обводит карту рамкой.
          if (ownTurn) selectNext(unit => hasActions(unit, canUnitStep));
          break;
        case 'Period':
          if (!ownTurn) return;
          selectNext(isIdleWorker);
          break;
        case 'KeyH':
          focusBase();
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
};
