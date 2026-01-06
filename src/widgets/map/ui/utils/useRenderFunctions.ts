import { useCallback } from 'react';
import {
  renderEntitiesLayer,
  renderMovementLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  withClear,
} from '@widgets/map/lib';
import type { Building } from '@entities/buildings';
import type { Cell, Position, Unit } from '@shared/config';
import type { Selection } from '@features/selection';

type Props = {
  grid: Cell[][];
  buildings: Record<string, Building>;
  units: Record<string, Unit>;
  selection: Selection;
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;
};

export const useRenderFunctions = ({
  grid,
  buildings,
  units,
  selection,
  reachableCells,
  attackableTargets,
}: Props) => {
  const renderTerrain = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () => renderTerrainLayer(ctx, grid));
    },
    [grid],
  );

  const renderEntities = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () => renderEntitiesLayer(ctx, buildings, units));
    },
    [buildings, units],
  );

  const renderMovement = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderMovementLayer(ctx, reachableCells, attackableTargets),
      );
    },
    [attackableTargets, reachableCells],
  );

  const renderSelection = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderSelectionLayer(ctx, buildings, units, selection),
      );
    },
    [buildings, selection, units],
  );

  return { renderTerrain, renderEntities, renderSelection, renderMovement };
};
