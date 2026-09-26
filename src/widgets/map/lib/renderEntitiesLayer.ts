import type { Building, BuildingType, Owner, Unit } from '@shared/config';
import type { CellRange } from '@shared/lib';
import {
  drawBarracks,
  drawBase,
  drawFarm,
  drawGoldMine,
  drawSawmill,
  drawTower,
} from './drawBuildings';
import { drawArcher, drawSwordsman, drawWorker } from './drawUnits';
import { drawHpBar } from './drawHpBar';
import { drawActionPips } from './drawActionPips';

/** Смещение в клетках и масштаб сущностей, которые сейчас анимируются. */
export type CellOffsets = Map<
  string,
  { dx: number; dy: number; scale?: number }
>;

const SPENT_ALPHA = 0.45;

const BUILDING_DRAWERS = {
  base: drawBase,
  mine: drawGoldMine,
  sawmill: drawSawmill,
  farm: drawFarm,
  barracks: drawBarracks,
  tower: drawTower,
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

/** Объект целиком вне окна камеры: его не рисуем. */
const isOutside = (range: CellRange | undefined, x: number, y: number) =>
  !!range && (x < range.x0 || x >= range.x1 || y < range.y0 || y >= range.y1);

// Свою сущность без очков действий гасим: видно, кем ещё можно ходить.
const isSpentUnit = (unit: Unit, humanId: Owner | null) =>
  unit.owner === humanId &&
  unit.movePoints === 0 &&
  (unit.role === 'military' ? unit.attackPoints === 0 : unit.buildPoints === 0);

const isSpentBuilding = (building: Building, humanId: Owner | null) => {
  if (building.owner !== humanId) return false;
  if (building.role === 'combat') return building.attackPoints === 0;
  if (building.role === 'production') return building.spawnPoints === 0;

  return false;
};

/**
 * Рисует здания и юнитов с текущими смещениями и состоянием действий.
 *
 * @param ctx - Контекст холста.
 * @param buildings - Здания на карте.
 * @param units - Юниты на карте.
 * @param cellSize - Размер клетки в пикселях.
 * @param offsets - Смещения в клетках и масштабы анимируемых сущностей.
 * @param humanId - Участник интерфейса: его сущности гаснут без очков и показывают очки.
 * @param range - Клетки в окне камеры с запасом; без него рисуется всё.
 */
export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  cellSize: number,
  offsets?: CellOffsets,
  humanId: Owner | null = null,
  range?: CellRange,
) => {
  Object.values(buildings).forEach(building => {
    const { id, x, y, type, hp, maxHp, owner } = building;
    if (isOutside(range, x, y)) return;
    const hpRatio = hp / maxHp;
    const { dx = 0, dy = 0, scale = 1 } = offsets?.get(id) ?? {};

    ctx.save();
    if (isSpentBuilding(building, humanId)) ctx.globalAlpha = SPENT_ALPHA;

    drawBuildingModel(ctx, type, x + dx, y + dy, cellSize, owner, scale);
    ctx.restore();

    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
  });

  Object.values(units).forEach(unit => {
    const { id, x, y, type, hp, maxHp, owner } = unit;
    if (isOutside(range, x, y)) return;
    const hpRatio = hp / maxHp;
    const { dx = 0, dy = 0, scale = 1 } = offsets?.get(id) ?? {};

    ctx.save();
    if (isSpentUnit(unit, humanId)) ctx.globalAlpha = SPENT_ALPHA;

    if (type === 'swordsman') {
      drawSwordsman(ctx, x + dx, y + dy, cellSize, owner, scale);
    }

    if (type === 'archer') {
      drawArcher(ctx, x + dx, y + dy, cellSize, owner, scale);
    }

    if (type === 'worker') {
      drawWorker(ctx, x + dx, y + dy, cellSize, owner, scale);
    }
    ctx.restore();

    // Полоса здоровья и очки остаются контрастными даже у отходившего юнита.
    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
    if (owner === humanId) drawActionPips(ctx, x + dx, y + dy, cellSize, unit);
  });
};
