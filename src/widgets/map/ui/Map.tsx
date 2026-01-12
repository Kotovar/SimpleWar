import type { MouseEvent } from 'react';
import { useUnitsSelectors, useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSettingsSelectors } from '@entities/settings';
import { useSelectionSelectors } from '@features/selection';
import { attack } from '@features/combat';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import {
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
  const { moveUnit } = useUnitsSelectors();

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
    buildableCells,
    calculateMovement,
    resetStore: clearMovement,
  } = useMovementSelectors();

  const { spawnableCells, resetStore: clearHighlight } =
    useHighlightSelectors();

  const { selectCell } = terrainSelection;
  const { selectUnit, getSelectedUnit } = unitsSelection;
  const { selectBuilding, getSelectedBuilding } = buildingsSelection;

  const CANVAS_SIZES = {
    width: canvasWidth,
    height: canvasHeight,
  };

  const handleCanvasClick = (
    event: MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
  ) => {
    if (!canvas) return;

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
        moveUnit,
        attack,
        build,
        clearSelection,
        clearMovement,
      );

      return;
    }

    // 5. Выбрано своё здание
    if (selectedBuilding && selectedBuilding.owner === 'player') {
      handleClickWithPlayerBuildingSelected(
        selectedBuilding,
        gridX,
        gridY,
        spawnableCells,
        spawn,
        clearSelection,
        clearHighlight,
      );

      return;
    }
  };

  return (
    <div
      className={styles.CanvasWrapper}
      style={{ width: CANVAS_SIZES.width, height: CANVAS_SIZES.height }}
    >
      <StartGameCanvas />
      <CanvasLayers handleClick={handleCanvasClick} />
      <FinishGameCanvas />
    </div>
  );
};
