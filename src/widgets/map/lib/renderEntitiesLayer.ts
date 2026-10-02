import {
  DAMAGED_BUILDING_RATIO,
  type Building,
  type BuildingType,
  type Owner,
  type Unit,
  type UnitType,
} from '@shared/config';
import type { CellRange } from '@shared/lib';
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
import {
  drawArcher,
  drawGriffon,
  drawHealer,
  drawMage,
  drawRider,
  drawScout,
  drawSiege,
  drawSpearman,
  drawSwordsman,
  drawWorker,
} from './drawUnits';
import { drawHpBar } from './drawHpBar';
import { drawActionPips } from './drawActionPips';
import { drawWorkBadge } from './drawWorkBadge';
import { drawIdleBadge } from './drawIdleBadge';
import { drawFormationBadge } from './drawFormationBadge';
import {
  drawDamagedBuilding,
  drawRoleIcon,
  drawRestBadge,
  getDetailLevel,
} from './drawEntityStatus';
import { isHostile } from '@shared/lib';
import { getHealTargets } from '@features/combat';
import { getResearchArmor } from '@entities/researches';

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
  stable: drawStable,
  workshop: drawWorkshop,
  forge: drawForge,
  palisade: drawPalisade,
  sanctuary: drawSanctuary,
} satisfies Record<BuildingType, unknown>;

const UNIT_DRAWERS = {
  worker: drawWorker,
  swordsman: drawSwordsman,
  archer: drawArcher,
  scout: drawScout,
  spearman: drawSpearman,
  rider: drawRider,
  siege: drawSiege,
  mage: drawMage,
  healer: drawHealer,
  griffon: drawGriffon,
} satisfies Record<UnitType, unknown>;

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

/**
 * Свою сущность без полезных действий гасим: видно, кем ещё можно ходить.
 * Военный без очков движения считается отходившим и с очком атаки, если
 * в его дальности нет видимых врагов. Очки, которых не хватает ни на одну
 * соседнюю клетку (`stuck`), — то же, что их отсутствие.
 */
const isSpentUnit = (
  unit: Unit,
  humanId: Owner | null,
  hasTarget: (unit: Unit) => boolean,
  stuck: ReadonlySet<string>,
) =>
  unit.owner === humanId &&
  (unit.movePoints === 0 || stuck.has(unit.id)) &&
  (unit.role === 'military'
    ? unit.attackPoints === 0 ||
      // Осадная машина бьёт по клетке: цель ей не нужна.
      (unit.type !== 'siege' && !hasTarget(unit))
    : unit.buildPoints === 0);

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
 * @param staffed - Свои рудники и лесопилки с рабочим внутри.
 * @param healingUnits - Юниты для проверки лечения, включая рабочих внутри зданий;
 *   цели фильтруются по владельцу лекаря и не рисуются этим параметром.
 * @param stuck - Свои юниты с очками хода, которым некуда шагнуть.
 */
export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  cellSize: number,
  offsets?: CellOffsets,
  humanId: Owner | null = null,
  range?: CellRange,
  staffed: ReadonlySet<string> = new Set(),
  healingUnits: Iterable<Unit> = Object.values(units),
  stuck: ReadonlySet<string> = new Set(),
) => {
  const enemies = [...Object.values(units), ...Object.values(buildings)].filter(
    entity => humanId !== null && isHostile(humanId, entity.owner),
  );
  const hasTarget = (unit: Unit) =>
    unit.role === 'military' &&
    (unit.type === 'healer'
      ? getHealTargets(unit, healingUnits).length > 0
      : enemies.some(
          enemy =>
            Math.abs(enemy.x - unit.x) + Math.abs(enemy.y - unit.y) <=
            unit.attackRange,
        ));

  // Издалека — значки роли и владельца, вблизи — рисунок и мелкие значки.
  const detail = getDetailLevel(cellSize);

  Object.values(buildings).forEach(building => {
    const { id, x, y, type, hp, maxHp, owner } = building;
    if (isOutside(range, x, y)) return;
    const hpRatio = hp / maxHp;
    const { dx = 0, dy = 0, scale = 1 } = offsets?.get(id) ?? {};

    ctx.save();
    if (isSpentBuilding(building, humanId)) ctx.globalAlpha = SPENT_ALPHA;

    if (detail === 'icon') {
      drawRoleIcon(ctx, 'building', x + dx, y + dy, cellSize, owner);
      ctx.restore();
      return;
    }
    drawBuildingModel(ctx, type, x + dx, y + dy, cellSize, owner, scale);
    ctx.restore();
    if (hpRatio <= DAMAGED_BUILDING_RATIO) {
      drawDamagedBuilding(ctx, x + dx, y + dy, cellSize);
    }

    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
    // Свой рудник или лесопилка: рабочий внутри или простой без него.
    if (
      detail === 'detail' &&
      owner === humanId &&
      building.role === 'resource'
    ) {
      if (staffed.has(id)) drawWorkBadge(ctx, x + dx, y + dy, cellSize);
      else drawIdleBadge(ctx, x + dx, y + dy, cellSize);
    }
  });

  const unitList = Object.values(units);
  unitList.forEach(unit => {
    const { id, x, y, type, hp, maxHp, owner } = unit;
    if (isOutside(range, x, y)) return;
    const hpRatio = hp / maxHp;
    const { dx = 0, dy = 0, scale = 1 } = offsets?.get(id) ?? {};

    ctx.save();
    if (isSpentUnit(unit, humanId, hasTarget, stuck)) {
      ctx.globalAlpha = SPENT_ALPHA;
    }

    if (detail === 'icon') {
      drawRoleIcon(ctx, unit.role, x + dx, y + dy, cellSize, owner);
      ctx.restore();
      if (owner === humanId)
        drawRestBadge(ctx, x + dx, y + dy, cellSize, unit.restMode);
      return;
    }
    UNIT_DRAWERS[type](ctx, x + dx, y + dy, cellSize, owner, scale);
    ctx.restore();

    // Полоса здоровья и очки остаются контрастными даже у отходившего юнита.
    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
    if (owner === humanId)
      drawRestBadge(ctx, x + dx, y + dy, cellSize, unit.restMode);
    if (detail !== 'detail') return;
    if (owner === humanId) drawActionPips(ctx, x + dx, y + dy, cellSize, unit);
    // Строй — по видимым соседям, как предпросмотр урона.
    if (getResearchArmor(unit, unitList) > 0) {
      drawFormationBadge(ctx, x + dx, y + dy, cellSize);
    }
  });
};
