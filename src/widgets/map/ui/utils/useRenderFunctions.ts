import { RefObject, useCallback, useEffect } from 'react';
import { useSettingsSelectors } from '@entities/settings';
import { useBuildingsSelectors } from '@entities/buildings';
import { useUnitsSelectors } from '@entities/units';
import { useMapSelectors } from '@entities/maps';
import type { Position } from '@shared/config';
import type { Selection } from '@features/selection';
import {
  useHighlightSelectors,
  useMovementSelectors,
} from '@features/pathfinding';
import {
  renderMovementLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  withClear,
} from '@widgets/map/lib';
import { setupCanvas, useEntitiesLayer } from '@widgets/map/ui/utils';

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

  useEntitiesLayer({
    ref: unitsRef,
    buildings,
    units,
    cellSize,
    width: canvasWidth,
    height: canvasHeight,
  });

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
        renderSelectionLayer(ctx, buildings, units, selection, cellSize, hover),
      );
    },
    [buildings, cellSize, hover, selection, units],
  );

  useEffect(() => {
    const ctx = setupCanvas(terrainRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderTerrain(ctx);
  }, [canvasHeight, canvasWidth, renderTerrain, terrainRef]);

  useEffect(() => {
    const ctx = setupCanvas(movementRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderMovement(ctx);
  }, [canvasHeight, canvasWidth, movementRef, renderMovement]);

  useEffect(() => {
    const ctx = setupCanvas(highlightRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderSelection(ctx);
  }, [canvasHeight, canvasWidth, highlightRef, renderSelection]);
};
