import type { SiteType } from '@shared/config';
import { circle, rect, shape } from '../EntityPortrait/drawEntity';

/** Нейтральный значок находки, общий для карты и карточки. */
export const drawSite = (
  ctx: CanvasRenderingContext2D,
  type: SiteType,
  x: number,
  y: number,
  cellSize: number,
) => {
  ctx.save();
  ctx.translate(x * cellSize, y * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#33332d';
  ctx.fillStyle = '#26312abb';
  ctx.beginPath();
  ctx.ellipse(16, 26, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (type) {
    case 'cache':
      rect(ctx, '#805430', 5, 14, 22, 11);
      shape(ctx, '#b48852', [5, 14, 8, 8, 24, 8, 27, 14]);
      rect(ctx, '#e2bd67', 9, 9, 3, 15);
      rect(ctx, '#e2bd67', 21, 9, 3, 15);
      rect(ctx, '#f8d78a', 14, 15, 4, 5);
      break;
    case 'refugees':
      rect(ctx, '#c1966d', 3, 20, 6, 6);
      shape(ctx, '#d7c6a1', [9, 25, 10, 15, 15, 13, 20, 16, 22, 25]);
      circle(ctx, '#e9c8a0', 15, 10, 3.5);
      shape(ctx, '#a8b7a5', [21, 26, 22, 18, 26, 18, 29, 26]);
      circle(ctx, '#e9c8a0', 24, 15, 2.5);
      break;
    case 'obelisk':
      rect(ctx, '#858b84', 8, 24, 16, 3);
      shape(ctx, '#bbc6bd', [11, 24, 12, 8, 16, 3, 20, 8, 21, 24]);
      shape(ctx, '#82948e', [16, 3, 20, 8, 21, 24, 17, 24]);
      shape(ctx, '#a6e6da', [15, 11, 18, 14, 15, 18, 13, 14]);
      break;
    case 'ruins':
      rect(ctx, '#b3b6a5', 5, 15, 6, 11);
      rect(ctx, '#cbd0ba', 5, 10, 4, 5);
      rect(ctx, '#919d91', 21, 12, 6, 14);
      rect(ctx, '#b3b6a5', 11, 21, 10, 5);
      shape(ctx, '#cbd0ba', [10, 15, 11, 11, 18, 11, 20, 15]);
      shape(ctx, '#707b6a', [12, 26, 15, 21, 18, 26]);
      break;
    case 'camp':
      shape(ctx, '#c3a477', [3, 24, 11, 8, 20, 24]);
      shape(ctx, '#755a40', [9, 24, 11, 14, 16, 24]);
      shape(ctx, '#e1ca99', [16, 25, 23, 13, 30, 25]);
      rect(ctx, '#988667', 22, 3, 1.5, 11);
      shape(ctx, '#e5b661', [24, 3, 30, 5, 24, 8]);
      circle(ctx, '#efb04e', 18, 26, 2);
      break;
  }
  ctx.restore();
};
