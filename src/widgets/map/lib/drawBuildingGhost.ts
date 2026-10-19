import type { BuildingType, Owner, TeamStyle } from '@shared/config';
import { drawBuildingModel } from './drawModels';

/**
 * Полупрозрачное здание на месте будущей стройки. С `valid` клетка
 * подкрашена: зелёная — заложить можно, красная — нельзя; без него —
 * уже назначенная стройка, ждущая рабочего.
 *
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 */
export const drawBuildingGhost = (
  ctx: CanvasRenderingContext2D,
  type: BuildingType,
  x: number,
  y: number,
  cellSize: number,
  owner: Owner,
  valid?: boolean,
  team?: TeamStyle,
) => {
  ctx.save();
  if (valid !== undefined) {
    ctx.fillStyle = valid
      ? 'rgba(120, 220, 140, 0.3)'
      : 'rgba(235, 90, 80, 0.4)';
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  }
  ctx.globalAlpha *= valid === false ? 0.45 : 0.6;
  drawBuildingModel(ctx, type, x, y, cellSize, owner, 1, team);
  ctx.restore();
};
