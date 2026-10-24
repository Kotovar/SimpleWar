import type { CellRange } from '@shared/lib';
import { drawSite } from '@shared/ui';
import type { KnownSite } from '@entities/perceptions';

/** Находки сцены рисуются под туманом: память темнеет вместе с местностью. */
export const renderSites = (
  ctx: CanvasRenderingContext2D,
  sites: Record<string, KnownSite>,
  cellSize: number,
  range: CellRange,
) => {
  for (const site of Object.values(sites)) {
    const { x, y, type } = site;
    if (x < range.x0 || x >= range.x1 || y < range.y0 || y >= range.y1)
      continue;
    drawSite(ctx, type, x, y, cellSize);
  }
};
