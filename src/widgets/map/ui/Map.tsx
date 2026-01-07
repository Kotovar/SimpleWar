import { useRef } from 'react';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { CANVAS_SIZE, CELL_SIZE, GRID_SIZE } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSelectionSelectors } from '@features/selection';
import { useUnitsSelectors, useMovementSelectors } from '@widgets/map/model';
import {
  getGridCoordsFromEvent,
  handleClickWithoutSelectedUnit,
  handleClickWithPlayerUnitSelected,
} from './utils';
import { useRenderFunctions } from './utils/useRenderFunctions';
import { attack } from '@features/combat';
import styles from './styles.module.css';

const CANVAS_SIZES = {
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
};

export const Map = () => {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const unitsRef = useRef<HTMLCanvasElement>(null);
  const movementRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLCanvasElement>(null);

  const { moveUnit } = useUnitsSelectors();

  const {
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    selection,
    clearSelection,
    isClickOnCurrentSelection,
  } = useSelectionSelectors();

  const {
    reachableCells,
    attackableTargets,
    calculateMovement,
    clearMovement,
  } = useMovementSelectors();

  const { selectCell } = terrainSelection;
  const { selectUnit, getSelectedUnit } = unitsSelection;
  const { selectBuilding, getSelectedBuilding } = buildingsSelection;

  useRenderFunctions({
    selection,
    reachableCells,
    terrainRef,
    unitsRef,
    movementRef,
    highlightRef,
  });

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = highlightRef.current;
    if (!canvas) return;

    const { x: gridX, y: gridY } = getGridCoordsFromEvent(
      event,
      canvas,
      CELL_SIZE,
    );

    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
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
      return;
    }

    // 2. Если выбрана вражеская сущность (юнит ИЛИ здание) — любой клик снимает выделение
    //    и больше ничего не делает (не выделяем клетку, не атакуем и т.д.)
    if (
      selectedUnit?.owner === 'enemy' ||
      selectedBuilding?.owner === 'enemy'
    ) {
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

    // 4. Выбрана своя сущность
    //    Пока можно отдавать приказы только с выбранным своим юнитом
    if (selectedUnit && selectedUnit.owner === 'player') {
      handleClickWithPlayerUnitSelected(
        selectedUnit,
        gridX,
        gridY,
        unit,
        building,
        reachableCells,
        attackableTargets,
        moveUnit,
        attack,
        clearSelection,
        clearMovement,
      );

      return;
    }
  };

  return (
    <div
      className={styles.CanvasWrapper}
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
    >
      <canvas
        className={clsx(styles.CanvasLayer, styles.Terrain, {
          [styles.Pointer]: true,
          [styles.Move]: selection?.kind === 'unit',
          [styles.Building]: selection?.kind === 'building',
        })}
        ref={terrainRef}
        {...CANVAS_SIZES}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Unit)}
        ref={unitsRef}
        {...CANVAS_SIZES}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Movement)}
        ref={movementRef}
        {...CANVAS_SIZES}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Highlight)}
        ref={highlightRef}
        onClick={handleCanvasClick}
        {...CANVAS_SIZES}
      />
    </div>
  );
};
