import { drawSelectionHighlight } from './drawSelectionHighlight';

// Рисунок клеток живёт в shared/ui: его же использует миниатюра клетки в панели.
export {
  drawForest,
  drawGoldOre,
  drawMountains,
  TERRAIN_VARIANTS,
} from '@shared/ui';

export const drawTerrainHighlight = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  pulse = 0,
) => {
  drawSelectionHighlight(ctx, cellX, cellY, cellSize, 'cell', pulse);
};
