import { useCallback } from 'react';
import {
  renderEntitiesLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  withClear,
} from '@widgets/map/lib';
import type { Building } from '@entities/buildings';
import type { Unit } from '@entities/units';
import type { Cell } from '@shared/config';
import type { Selection } from '@features/selection';

type Props = {
  grid: Cell[][];
  buildings: Record<string, Building>;
  units: Record<string, Unit>;
  selection: Selection;
};

export const useRenderFunctions = ({
  grid,
  buildings,
  units,
  selection,
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

  const renderSelection = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderSelectionLayer(ctx, buildings, units, selection),
      );
    },
    [buildings, selection, units],
  );

  return { renderTerrain, renderEntities, renderSelection };
};
