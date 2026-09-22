import { RefObject, useCallback, useEffect, useMemo } from 'react';
import { useSettingsSelectors } from '@entities/settings';
import { useBuildingsSelectors } from '@entities/buildings';
import { useUnitsSelectors } from '@entities/units';
import { useMapSelectors } from '@entities/maps';
import type { Position } from '@shared/config';
import type { Selection } from '@features/selection';
import {
  createMovementPFGrid,
  getPath,
  useHighlightSelectors,
  useMovementSelectors,
} from '@features/pathfinding';
import {
  renderMovementLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  withClear,
} from '@widgets/map/lib';
import {
  setupCanvas,
  useDevicePixelRatio,
  useEntitiesLayer,
} from '@widgets/map/ui/utils';

type Props = {
  selection: Selection;
  hover: Position | null;
  terrainRef: RefObject<HTMLCanvasElement | null>;
  unitsRef: RefObject<HTMLCanvasElement | null>;
  movementRef: RefObject<HTMLCanvasElement | null>;
  highlightRef: RefObject<HTMLCanvasElement | null>;
};

export const useRenderFunctions = ({
  selection,
  hover,
  terrainRef,
  unitsRef,
  movementRef,
  highlightRef,
}: Props) => {
  const { grid } = useMapSelectors();
  const { buildings } = useBuildingsSelectors();
  const { units } = useUnitsSelectors();
  const { attackableTargets, reachableCells } = useMovementSelectors();
  const { spawnableCells, buildableCells } = useHighlightSelectors();
  const { cellSize, gridColumns, canvasWidth, canvasHeight } =
    useSettingsSelectors();
  const pixelRatio = useDevicePixelRatio();

  useEntitiesLayer({
    ref: unitsRef,
    buildings,
    units,
    cellSize,
    width: canvasWidth,
    height: canvasHeight,
  });

  // Маршрут до клетки под курсором: показываем путь и цену до клика.
  const hoverPath = useMemo(() => {
    if (!hover || selection?.kind !== 'unit') return null;

    const unit = units[selection.id];
    const isReachable = reachableCells?.some(
      cell => cell.x === hover.x && cell.y === hover.y,
    );
    if (!unit || unit.owner !== 'player' || !isReachable) return null;

    const path = getPath(unit, hover, createMovementPFGrid(grid));

    return path.length > 1 ? path : null;
  }, [grid, hover, reachableCells, selection, units]);

  const renderTerrain = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderTerrainLayer(ctx, grid, cellSize, gridColumns),
      );
    },
    [cellSize, grid, gridColumns],
  );

  const renderMovement = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderMovementLayer(
          ctx,
          reachableCells,
          attackableTargets,
          buildableCells,
          spawnableCells,
          cellSize,
        ),
      );
    },
    [
      attackableTargets,
      buildableCells,
      cellSize,
      reachableCells,
      spawnableCells,
    ],
  );

  const renderSelection = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderSelectionLayer(ctx, buildings, units, selection, cellSize, {
          hover,
          path: hoverPath,
          attackableTargets,
        }),
      );
    },
    [
      attackableTargets,
      buildings,
      cellSize,
      hover,
      hoverPath,
      selection,
      units,
    ],
  );

  useEffect(() => {
    const ctx = setupCanvas(terrainRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderTerrain(ctx);
  }, [canvasHeight, canvasWidth, pixelRatio, renderTerrain, terrainRef]);

  useEffect(() => {
    const ctx = setupCanvas(movementRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderMovement(ctx);
  }, [canvasHeight, canvasWidth, movementRef, pixelRatio, renderMovement]);

  useEffect(() => {
    const ctx = setupCanvas(highlightRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderSelection(ctx);
  }, [canvasHeight, canvasWidth, highlightRef, pixelRatio, renderSelection]);
};
