import type { BuildingType, Owner, UnitType, TeamStyle } from '@shared/config';
import type { SiegePose } from '@shared/ui';
import {
  drawArcher,
  drawGriffon,
  drawHealer,
  drawHorseArcher,
  drawKnight,
  drawMage,
  drawRider,
  drawScout,
  drawSiege,
  drawSpearman,
  drawSwordsman,
  drawWorker,
} from './drawUnits';
import {
  drawBarracks,
  drawBase,
  drawFarm,
  drawForge,
  drawPalisade,
  drawBeacon,
  drawOutpost,
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
  beacon: drawBeacon,
  outpost: drawOutpost,
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
  team?: TeamStyle,
) => BUILDING_DRAWERS[type](ctx, x, y, cellSize, owner, scale, team);

const UNIT_DRAWERS = {
  worker: drawWorker,
  swordsman: drawSwordsman,
  archer: drawArcher,
  scout: drawScout,
  spearman: drawSpearman,
  rider: drawRider,
  knight: drawKnight,
  horseArcher: drawHorseArcher,
  siege: drawSiege,
  mage: drawMage,
  healer: drawHealer,
  griffon: drawGriffon,
} satisfies Record<UnitType, unknown>;

/**
 * Рисует модель юнита без полосы здоровья и значков.
 *
 * @param x - Столбец клетки, может быть дробным во время анимации.
 * @param y - Строка клетки.
 * @param pose - Поза рычага катапульты; другим юнитам не нужна.
 */
export const drawUnitModel = (
  ctx: CanvasRenderingContext2D,
  type: UnitType,
  x: number,
  y: number,
  cellSize: number,
  owner: Owner,
  scale = 1,
  pose?: SiegePose,
  team?: TeamStyle,
) =>
  type === 'siege'
    ? drawSiege(ctx, x, y, cellSize, owner, scale, pose, team)
    : UNIT_DRAWERS[type](ctx, x, y, cellSize, owner, scale, team);
