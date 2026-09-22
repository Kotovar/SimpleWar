import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { CELL_SIZE } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsSelectors, useBuildingsStore } from '@entities/buildings';
import { useSettingsSelectors } from '@entities/settings';
import { useSelectionSelectors } from '@features/selection';
import { attack } from '@features/combat';
import { useGameLoopSelectors } from '@features/game-loop';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import {
  move,
  useMovementSelectors,
  useHighlightSelectors,
} from '@features/pathfinding';
import {
  getGridCoordsFromEvent,
  handleClickWithoutSelectedUnit,
  handleClickWithPlayerBuildingSelected,
  handleClickWithPlayerUnitSelected,
} from './utils';
import { StartGameCanvas } from './StartGameCanvas';
import { FinishGameCanvas } from './FinishGameCanvas';
import { CanvasLayers } from './CanvasLayers';
import styles from './styles.module.css';

export const Map = () => {
  const { phase } = useGameLoopSelectors();
  const drag = useRef<{
    x: number;
    y: number;
    pointerId: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const {
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
    isClickOnCurrentSelection,
  } = useSelectionSelectors();

  const {
    canvasWidth,
    canvasHeight,
    gridColumns,
    gridRows,
    cellSize,
    zoomBy,
    resetZoom,
  } = useSettingsSelectors();
  const viewport = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  // Колесо масштабирует карту, а не прокручивает её, поэтому слушатель не пассивный.
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;

    let frame = 0;
    let pending: { anchorX: number; anchorY: number; x: number; y: number };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();

      const box = wrapper.current?.getBoundingClientRect();
      if (!box) return;

      // Размер клетки берём из самой разметки: при быстрой серии событий
      // состояние ещё не перерисовано, и значение из него уже неверно.
      const size = box.width / gridColumns;

      // Клетка под курсором должна остаться под ним и после масштабирования.
      pending = {
        anchorX: (event.clientX - box.left) / size,
        anchorY: (event.clientY - box.top) / size,
        x: event.clientX,
        y: event.clientY,
      };

      zoomBy(event.deltaY < 0 ? 1 : -1);

      // Одна коррекция на кадр по последнему якорю: иначе события одного кадра
      // сдвинут прокрутку несколько раз подряд.
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;

        const next = wrapper.current?.getBoundingClientRect();
        const scroll = viewport.current;
        if (!next || !scroll) return;

        const nextSize = next.width / gridColumns;
        scroll.scrollLeft += next.left - pending.x + pending.anchorX * nextSize;
        scroll.scrollTop += next.top - pending.y + pending.anchorY * nextSize;
      });
    };

    element.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frame);
    };
  }, [gridColumns, zoomBy]);

  const {
    reachableCells,
    attackableTargets,

    calculateMovement,
    resetStore: clearMovement,
  } = useMovementSelectors();

  const {
    spawnableCells,
    buildableCells,
    resetStore: clearHighlight,
  } = useHighlightSelectors();

  const { selectCell } = terrainSelection;
  const { selectUnit, getSelectedUnit } = unitsSelection;
  const { selectBuilding, getSelectedBuilding } = buildingsSelection;

  const { clearSelectedBuildingForSpawn } = useBuildingsSelectors();

  const CANVAS_SIZES = {
    width: canvasWidth,
    height: canvasHeight,
  };

  const handleCanvasClick = (
    event: MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
  ) => {
    if (!canvas || event.button !== 0 || drag.current) return;

    const { x: gridX, y: gridY } = getGridCoordsFromEvent(
      event,
      canvas,
      cellSize,
    );

    if (gridX < 0 || gridX >= gridColumns || gridY < 0 || gridY >= gridRows) {
      return;
    }

    const unit = useUnitsStore.getState().getUnitAt(gridX, gridY);
    const building = useBuildingsStore.getState().getBuildingAt(gridX, gridY);
    const selectedUnit = getSelectedUnit();
    const selectedBuilding = getSelectedBuilding();

    // 1. Клик по уже выбранной сущности (юнит, здание или клетка) — снимаем выделение
    if (isClickOnCurrentSelection(gridX, gridY)) {
      clearSelection();
      clearMovement();
      clearHighlight();
      return;
    }

    // 2. Если выбрана вражеская сущность (юнит ИЛИ здание) — любой клик снимает выделение
    if (selectedUnit?.owner === 'ai' || selectedBuilding?.owner === 'ai') {
      clearSelection();
      clearMovement();
      clearHighlight();
      return;
    }

    // 3. Ничего не выбрано — выбираем новую сущность или клетку
    if (!selectedUnit && !selectedBuilding) {
      handleClickWithoutSelectedUnit(
        unit,
        building,
        gridX,
        gridY,
        selectUnit,
        selectBuilding,
        selectCell,
        calculateMovement,
        clearSelection,
        clearMovement,
      );
      return;
    }

    // 4. Выбран свой юнит
    if (selectedUnit && selectedUnit.owner === 'player') {
      handleClickWithPlayerUnitSelected(
        selectedUnit,
        gridX,
        gridY,
        unit,
        building,
        reachableCells,
        attackableTargets,
        buildableCells,
        move,
        attack,
        build,
        clearSelection,
        clearHighlight,
        clearMovement,
      );

      return;
    }

    // 5. Выбрано своё здание
    if (selectedBuilding && selectedBuilding.owner === 'player') {
      const target = unit ?? building;
      if (
        selectedBuilding.role === 'combat' &&
        target &&
        attackableTargets?.some(cell => cell.x === gridX && cell.y === gridY)
      ) {
        attack(selectedBuilding.id, target.id);
        clearSelection();
        clearMovement();
        clearHighlight();
        return;
      }
      handleClickWithPlayerBuildingSelected(
        selectedBuilding,
        gridX,
        gridY,
        spawnableCells,
        spawn,
        clearSelection,
        clearHighlight,
        clearMovement,
        clearSelectedBuildingForSpawn,
      );

      return;
    }
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      <div
        key={`${phase}-${gridColumns}-${gridRows}`}
        ref={viewport}
        className={styles.MapViewport}
        tabIndex={0}
        role='region'
        aria-label='Карта. Перетаскивайте любой кнопкой мыши, масштабируйте колесом. Левый клик выбирает клетку или выполняет действие.'
        onContextMenu={event => event.preventDefault()}
        onClickCapture={event => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          event.stopPropagation();
          event.preventDefault();
        }}
        onPointerDown={event => {
          if (event.pointerType !== 'mouse' || event.button > 2) return;
          suppressClick.current = false;
          const active = event.button !== 0;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            active,
          };
          // Левый клик до начала перетаскивания должен попасть в Canvas.
          if (active) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.dragging = 'true';
          }
        }}
        onPointerMove={event => {
          const current = drag.current;
          if (!current || current.pointerId !== event.pointerId) return;
          const dx = current.x - event.clientX;
          const dy = current.y - event.clientY;
          if (!current.active) {
            if (Math.hypot(dx, dy) < 5) return;
            current.active = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.dragging = 'true';
          }
          suppressClick.current = true;
          event.currentTarget.scrollLeft += dx;
          event.currentTarget.scrollTop += dy;
          current.x = event.clientX;
          current.y = event.clientY;
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onPointerLeave={event => {
          if (!drag.current?.active) finishDrag(event);
        }}
      >
        <div
          ref={wrapper}
          className={styles.CanvasWrapper}
          style={{ width: CANVAS_SIZES.width, height: CANVAS_SIZES.height }}
        >
          <StartGameCanvas />
          <CanvasLayers handleClick={handleCanvasClick} />
          <FinishGameCanvas />
        </div>
      </div>

      {cellSize !== CELL_SIZE && (
        <button
          type='button'
          className={styles.ZoomReset}
          onClick={resetZoom}
          title='Вернуть масштаб 100%'
        >
          {Math.round((cellSize / CELL_SIZE) * 100)}%
        </button>
      )}
    </>
  );
};
