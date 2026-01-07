import { Building, CELL_SIZE, Unit } from '@shared/config';
import { drawSelectionHighlight } from './drawSelectionHighlight';
import { drawTerrainHighlight } from './drawTerrain';
import type { Selection } from '@features/selection';

export const renderSelectionLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  selection: Selection | null,
) => {
  if (!selection) return;

  if (selection.kind === 'unit') {
    const unit = units[selection.id];
    if (unit) drawSelectionHighlight(ctx, unit.x, unit.y, CELL_SIZE);
  }

  if (selection.kind === 'building') {
    const building = buildings[selection.id];
    if (building)
      drawSelectionHighlight(ctx, building.x, building.y, CELL_SIZE);
  }

  if (selection.kind === 'cell') {
    drawTerrainHighlight(ctx, selection.x, selection.y, CELL_SIZE);
  }
};
