import { TEAM_MARKERS, type Owner } from '@shared/config';
import { rect, shape } from './drawEntity';

export const SKIN = '#ecc59a';
export const STEEL = '#c6d1d5';
export const OUTLINE = '#292c30';

/** Ноги в сапогах: общая основа всех юнитов. */
export const legs = (ctx: CanvasRenderingContext2D, color: string) => {
  rect(ctx, color, 12, 20.5, 3, 5);
  rect(ctx, color, 16.5, 20.5, 3, 5);
};

/** Туника в цвете стороны с поясом: основной признак принадлежности. */
export const tunic = (
  ctx: CanvasRenderingContext2D,
  owner: Owner,
  belt: string,
) => {
  shape(ctx, TEAM_MARKERS[owner].color, [10.5, 13, 21, 13, 22.5, 22, 9, 22]);
  ctx.fillStyle = belt;
  ctx.fillRect(9.9, 18.4, 11.8, 1.8);
};
