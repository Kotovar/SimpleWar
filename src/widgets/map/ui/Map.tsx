import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { CANVAS_SIZE, CELL_SIZE, GRID_SIZE } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSelectionSelectors } from '@features/selection';
import {
  useMapSelectors,
  useBuildingsSelectors,
  useUnitsSelectors,
} from '@widgets/map/model';
import {
  drawSwordsman,
  drawBackgroundAndGrid,
  drawBase,
  drawWater,
  drawForest,
  drawMountains,
  drawGoldOre,
  drawSelectionHighlight,
  drawTerrainHighlight,
} from '@widgets/map/lib';
import styles from './styles.module.css';
import { useMapStore } from '@entities/maps';
import { getGridCoordsFromEvent } from './utils';

export const Map = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { grid } = useMapSelectors();
  const { units, moveUnit } = useUnitsSelectors();
  const { buildings } = useBuildingsSelectors();

  const {
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
    selection,
    isClickOnCurrentSelection,
  } = useSelectionSelectors();

  const { selectCell } = terrainSelection;
  const { selectUnit, getSelectedUnit } = unitsSelection;
  const { selectBuilding } = buildingsSelection;

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
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

  const kind = selection?.kind;
  const selectionID = selection?.kind !== 'cell' ? selection?.id : undefined;
  const selectionX = selection?.kind === 'cell' ? selection.x : undefined;
  const selectionY = selection?.kind === 'cell' ? selection.y : undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawBackgroundAndGrid(ctx, CANVAS_SIZE, CELL_SIZE, GRID_SIZE);

    // Слои отрисовки
    // 1. Вода
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.type === 'water') drawWater(ctx, x, y, CELL_SIZE);
      }),
    );

    // 2. Горы
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.type === 'mountain') drawMountains(ctx, x, y, CELL_SIZE);
      }),
    );

    // 3. Лес + золото
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.type === 'forest') drawForest(ctx, x, y, CELL_SIZE);
        if (cell.type === 'gold') drawGoldOre(ctx, x, y, CELL_SIZE);
      }),
    );

    // 4. Здания
    Object.values(buildings).forEach(building => {
      const { x, y, type } = building;
      if (type === 'base') drawBase(ctx, x, y, CELL_SIZE);
    });

    // 5. Юниты
    Object.values(units).forEach(unit => {
      const { x, y, type } = unit;
      if (type === 'swordsman') drawSwordsman(ctx, x, y, CELL_SIZE);
    });

    // 6. Подсветки
    Object.values(buildings).forEach(building => {
      const { x, y, id } = building;

      if (kind === 'building' && selectionID === id)
        drawSelectionHighlight(ctx, x, y, CELL_SIZE);
    });

    Object.values(units).forEach(unit => {
      const { x, y, id } = unit;
      if (kind === 'unit' && selectionID === id)
        drawSelectionHighlight(ctx, x, y, CELL_SIZE);
    });

    if (
      kind === 'cell' &&
      selectionX !== undefined &&
      selectionY !== undefined
    ) {
      drawTerrainHighlight(ctx, selectionX, selectionY, CELL_SIZE);
    }
  }, [buildings, grid, kind, selectionID, selectionX, selectionY, units]);

  return (
    <canvas
      className={clsx(styles.Canvas, {
        [styles.Pointer]: true,
        [styles.Move]: selection?.kind === 'unit',
        [styles.Building]: selection?.kind === 'building',
      })}
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={handleCanvasClick}
    />
  );
};
