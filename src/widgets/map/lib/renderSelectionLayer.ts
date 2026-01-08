import { Building, Unit } from '@shared/config';
import type { Selection } from '@features/selection';
import { drawSelectionHighlight } from './drawSelectionHighlight';
import { drawTerrainHighlight } from './drawTerrain';

export const renderSelectionLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  selection: Selection | null,
  cellSize: number,
) => {
  if (!selection) return;

  if (selection.kind === 'unit') {
    const unit = units[selection.id];
    if (unit) drawSelectionHighlight(ctx, unit.x, unit.y, cellSize);
  }

  if (selection.kind === 'building') {
    const building = buildings[selection.id];
    if (building) drawSelectionHighlight(ctx, building.x, building.y, cellSize);
  }

  if (selection.kind === 'cell') {
    drawTerrainHighlight(ctx, selection.x, selection.y, cellSize);
  }
};
