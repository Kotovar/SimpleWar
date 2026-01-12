import { RefObject, useCallback, useEffect } from 'react';
import { useSettingsSelectors } from '@entities/settings';
import { useBuildingsSelectors } from '@entities/buildings';
import { useUnitsSelectors } from '@entities/units';
import { useMapSelectors } from '@entities/maps';
import type { Selection } from '@features/selection';
import {
  useHighlightSelectors,
  useMovementSelectors,
} from '@features/pathfinding';
import {
  renderEntitiesLayer,
  renderMovementLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  withClear,
} from '@widgets/map/lib';
import { getCtx } from '@widgets/map/ui/utils';

type Props = {
  selection: Selection;
  terrainRef: RefObject<HTMLCanvasElement | null>;
  unitsRef: RefObject<HTMLCanvasElement | null>;
  movementRef: RefObject<HTMLCanvasElement | null>;
  highlightRef: RefObject<HTMLCanvasElement | null>;
};

export const useRenderFunctions = ({
  selection,
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
  const { cellSize, gridColumns } = useSettingsSelectors();

  const renderTerrain = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderTerrainLayer(ctx, grid, cellSize, gridColumns),
      );
    },
    [cellSize, grid, gridColumns],
  );

  const renderEntities = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderEntitiesLayer(ctx, buildings, units, cellSize),
      );
    },
    [buildings, cellSize, units],
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
        renderSelectionLayer(ctx, buildings, units, selection, cellSize),
      );
    },
    [buildings, cellSize, selection, units],
  );

  useEffect(() => {
    const ctx = getCtx(terrainRef);
    if (!ctx) return;

    renderTerrain(ctx);
  }, [renderTerrain, terrainRef]);

  useEffect(() => {
    const ctx = getCtx(unitsRef);
    if (!ctx) return;

    renderEntities(ctx);
  }, [renderEntities, unitsRef]);

  useEffect(() => {
    const ctx = getCtx(movementRef);
    if (!ctx) return;

    renderMovement(ctx);
  }, [movementRef, renderMovement]);

  useEffect(() => {
    const ctx = getCtx(highlightRef);
    if (!ctx) return;

    renderSelection(ctx);
  }, [highlightRef, renderSelection]);
};
