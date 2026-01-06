import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { CANVAS_SIZE, CELL_SIZE, GRID_SIZE, Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSelectionSelectors } from '@features/selection';
import {
  useMapSelectors,
  useBuildingsSelectors,
  useUnitsSelectors,
  useMovementSelectors,
} from '@widgets/map/model';
import { getCtx, getGridCoordsFromEvent } from './utils';
import { useRenderFunctions } from './utils/useRenderFunctions';
import styles from './styles.module.css';

const CANVAS_SIZES = {
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
};

const isTargetInReachableCells = (
  reachableCells: Position[] | null,
  gridX: number,
  gridY: number,
) => reachableCells?.some(cell => cell.x === gridX && cell.y === gridY);

export const Map = () => {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const unitsRef = useRef<HTMLCanvasElement>(null);
  const movementRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLCanvasElement>(null);

  const { grid } = useMapSelectors();
  const { units, moveUnit } = useUnitsSelectors();
  const { buildings } = useBuildingsSelectors();

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
  const { selectBuilding } = buildingsSelection;

  const { renderTerrain, renderEntities, renderSelection, renderMovement } =
    useRenderFunctions({
      grid,
      buildings,
      units,
      selection,
      reachableCells,
      attackableTargets,
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
    const cell = useMapStore.getState().getCell(gridX, gridY);

    if (isClickOnCurrentSelection(gridX, gridY)) {
      clearSelection();
      clearMovement();

      return;
    }

    if (building) {
      clearSelection();
      selectBuilding(building.id);

      return;
    }

    if (unit) {
      clearSelection();
      selectUnit(unit.id);

      if (unit.owner === 'player') {
        calculateMovement(unit.id);
      }

      return;
    }

    if (cell) {
      const selectedUnit = getSelectedUnit();

      if (!selectedUnit) {
        clearSelection();
        selectCell(gridX, gridY);
        return;
      }

      if (
        selectedUnit.owner === 'player' &&
        isTargetInReachableCells(reachableCells, gridX, gridY)
      ) {
        moveUnit(selectedUnit.id, gridX, gridY);
        clearSelection();
        clearMovement();
      } else {
        return;
      }
    }
  };

  useEffect(() => {
    const ctx = getCtx(terrainRef);
    if (!ctx) return;

    renderTerrain(ctx);
  }, [renderTerrain]);

  useEffect(() => {
    const ctx = getCtx(unitsRef);
    if (!ctx) return;

    renderEntities(ctx);
  }, [renderEntities]);

  useEffect(() => {
    const ctx = getCtx(movementRef);
    if (!ctx) return;

    renderMovement(ctx);
  }, [renderMovement]);

  useEffect(() => {
    const ctx = getCtx(highlightRef);
    if (!ctx) return;

    renderSelection(ctx);
  }, [renderSelection]);

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
