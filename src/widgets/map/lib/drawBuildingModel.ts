import type { BuildingType, Owner } from '@shared/config';
import {
  drawBarracks,
  drawBase,
  drawFarm,
  drawForge,
  drawPalisade,
  drawGoldMine,
  drawSanctuary,
  drawSawmill,
  drawStable,
  drawTower,
  drawWorkshop,
} from './drawBuildings';

const BUILDING_DRAWERS = {
  base: drawBase,
  mine: drawGoldMine,
  sawmill: drawSawmill,
  farm: drawFarm,
  barracks: drawBarracks,
  tower: drawTower,
  stable: drawStable,
  workshop: drawWorkshop,
  forge: drawForge,
  palisade: drawPalisade,
  sanctuary: drawSanctuary,
} satisfies Record<BuildingType, unknown>;

/**
 * Рисует модель здания без полосы здоровья.
 *
 * @param x - Столбец клетки, может быть дробным во время анимации.
 * @param y - Строка клетки.
 */
export const drawBuildingModel = (
  ctx: CanvasRenderingContext2D,
  type: BuildingType,
  x: number,
  y: number,
  cellSize: number,
  owner: Owner,
  scale = 1,
) => BUILDING_DRAWERS[type](ctx, x, y, cellSize, owner, scale);
