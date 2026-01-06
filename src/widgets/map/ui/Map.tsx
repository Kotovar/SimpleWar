import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { CANVAS_SIZE, CELL_SIZE, GRID_SIZE } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSelectionSelectors } from '@features/selection';
import {
  useMapSelectors,
  useBuildingsSelectors,
  useUnitsSelectors,
} from '@widgets/map/model';
import { getCtx, getGridCoordsFromEvent } from './utils';
import { useRenderFunctions } from './utils/useRenderFunctions';
import styles from './styles.module.css';

const CANVAS_SIZES = {
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
};

export const Map = () => {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const unitsRef = useRef<HTMLCanvasElement>(null);
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

  const { selectCell } = terrainSelection;
  const { selectUnit, getSelectedUnit } = unitsSelection;
  const { selectBuilding } = buildingsSelection;

  const { renderTerrain, renderEntities, renderSelection } = useRenderFunctions(
    { grid, buildings, units, selection },
  );

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
      return;
    }

    if (cell) {
      const selectedUnit = getSelectedUnit();

      if (
        selectedUnit &&
        cell.isWalkable &&
        units[selectedUnit.id].owner === 'player'
      ) {
        moveUnit(selectedUnit.id, gridX, gridY);
        clearSelection();
        return;
      }

      clearSelection();
      selectCell(gridX, gridY);
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
        className={clsx(styles.CanvasLayer, styles.Highlight)}
        ref={highlightRef}
        onClick={handleCanvasClick}
        {...CANVAS_SIZES}
      />
    </div>
  );
};
