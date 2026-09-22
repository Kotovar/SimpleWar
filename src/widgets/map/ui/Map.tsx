import { useRef, type MouseEvent } from 'react';
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
  const drag = useRef<{ x: number; y: number } | null>(null);
  const {
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
    isClickOnCurrentSelection,
  } = useSelectionSelectors();

  const { canvasWidth, canvasHeight, gridColumns, gridRows, cellSize } =
    useSettingsSelectors();

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

  return (
    <div
      key={`${phase}-${gridColumns}-${gridRows}`}
      className={styles.MapViewport}
      tabIndex={0}
      role='region'
      aria-label='Карта. Перетаскивайте средней или правой кнопкой мыши.'
      onContextMenu={event => event.preventDefault()}
      onPointerDown={event => {
        if (event.button !== 1 && event.button !== 2) return;
        event.preventDefault();
        drag.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        event.currentTarget.scrollLeft += drag.current.x - event.clientX;
        event.currentTarget.scrollTop += drag.current.y - event.clientY;
        drag.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={event => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      <div
        className={styles.CanvasWrapper}
        style={{ width: CANVAS_SIZES.width, height: CANVAS_SIZES.height }}
      >
        <StartGameCanvas />
        <CanvasLayers handleClick={handleCanvasClick} />
        <FinishGameCanvas />
      </div>
    </div>
  );
};
