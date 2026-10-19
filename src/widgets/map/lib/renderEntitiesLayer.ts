import {
  DAMAGED_BUILDING_RATIO,
  TEAM_MARKERS,
  type TeamStyles,
  type Building,
  type Owner,
  type Unit,
} from '@shared/config';
import type { CellRange } from '@shared/lib';
import { drawHpBar } from './drawHpBar';
import { drawActionPips } from './drawActionPips';
import { drawWorkBadge } from './drawWorkBadge';
import { drawIdleBadge } from './drawIdleBadge';
import { drawFormationBadge } from './drawFormationBadge';
import { drawHourglass, type HourglassState } from './drawHourglass';
import { drawBuildingGhost } from './drawBuildingGhost';
import { drawBuildingModel, drawUnitModel } from './drawModels';
import {
  drawDamagedBuilding,
  drawRoleIcon,
  drawOrderBadge,
  drawRestBadge,
  getDetailLevel,
} from './drawEntityStatus';
import { isHostile } from '@shared/lib';
import { getHealTargets } from '@features/combat';
import { getResearchArmor } from '@entities/researches';

/**
 * Смещение в клетках и масштаб сущностей, которые сейчас анимируются;
 * `hp` — показываемое HP до попадания летящего удара.
 */
export type CellOffsets = Map<
  string,
  {
    dx: number;
    dy: number;
    scale?: number;
    hp?: number;
    /** Поза рычага катапульты: `0` — поднят, `1` — взведён. */
    arm?: number;
    /** Камень в чаше катапульты; после выстрела — нет до перезарядки. */
    loaded?: boolean;
  }
>;

export { drawBuildingModel, drawUnitModel } from './drawModels';

/** Объект целиком вне окна камеры: его не рисуем. */
const isOutside = (range: CellRange | undefined, x: number, y: number) =>
  !!range && (x < range.x0 || x >= range.x1 || y < range.y0 || y >= range.y1);

/**
 * Своя сущность без полезных действий: видно, кем ещё можно ходить.
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
 * Свои сущности, потратившие полезные действия хода: им рисуются
 * песочные часы.
 *
 * @param humanId - Участник интерфейса; чужие сущности не отмечаются.
 * @param healingUnits - Юниты для проверки лечения, включая рабочих внутри зданий;
 *   цели фильтруются по владельцу лекаря.
 * @param stuck - Свои юниты с очками хода, которым некуда шагнуть.
 * @returns ID отходивших юнитов и зданий.
 */
export const getSpentIds = (
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  humanId: Owner | null,
  healingUnits: Iterable<Unit> = Object.values(units),
  stuck: ReadonlySet<string> = new Set(),
) => {
  const spent = new Set<string>();
  if (humanId === null) return spent;
  const enemies = [...Object.values(units), ...Object.values(buildings)].filter(
    entity => isHostile(humanId, entity.owner),
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
  Object.values(buildings).forEach(building => {
    if (isSpentBuilding(building, humanId)) spent.add(building.id);
  });
  Object.values(units).forEach(unit => {
    if (isSpentUnit(unit, humanId, hasTarget, stuck)) spent.add(unit.id);
  });
  return spent;
};

/**
 * Рисует здания и юнитов с текущими смещениями и состоянием действий.
 *
 * @param ctx - Контекст холста.
 * @param buildings - Здания на карте.
 * @param units - Юниты на карте.
 * @param cellSize - Размер клетки в пикселях.
 * @param offsets - Смещения в клетках и масштабы анимируемых сущностей.
 * @param humanId - Участник интерфейса: его сущности показывают очки и значки.
 * @param range - Клетки в окне камеры с запасом; без него рисуется всё.
 * @param staffed - Свои рудники и лесопилки с рабочим внутри.
 * @param hourglasses - Кадры песочных часов отходивших сущностей
 *   (см. {@link getSpentIds}).
 * @param orderUnits - Юниты с приказами стройки для зданий-призраков,
 *   включая рабочих внутри зданий; рисуются только свои.
 * @param cocked - Катапульты со взведённым рычагом: удар подготовлен и
 *   смотрящему это известно.
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
  hourglasses: ReadonlyMap<string, HourglassState> = new Map(),
  orderUnits: Iterable<Unit> = Object.values(units),
  cocked: ReadonlySet<string> = new Set(),
  teams: TeamStyles = TEAM_MARKERS,
) => {
  // Издалека — значки роли и владельца, вблизи — рисунок и мелкие значки.
  const detail = getDetailLevel(cellSize);

  // Назначенные стройки: здание-призрак ждёт рабочего, ресурсы в резерве.
  [...orderUnits].forEach(({ owner, order }) => {
    if (owner !== humanId || order?.type !== 'build' || order.stopped) return;
    if (isOutside(range, order.x, order.y)) return;
    drawBuildingGhost(
      ctx,
      order.buildingType,
      order.x,
      order.y,
      cellSize,
      owner,
      undefined,
      teams[owner],
    );
  });

  Object.values(buildings).forEach(building => {
    const { id, x, y, type, hp, maxHp, owner } = building;
    if (isOutside(range, x, y)) return;
    const {
      dx = 0,
      dy = 0,
      scale = 1,
      hp: shown = hp,
    } = offsets?.get(id) ?? {};
    const hpRatio = shown / maxHp;

    const hourglass = hourglasses.get(id);

    if (detail === 'icon') {
      drawRoleIcon(
        ctx,
        'building',
        x + dx,
        y + dy,
        cellSize,
        owner,
        teams[owner],
      );
      if (hourglass) drawHourglass(ctx, x + dx, y + dy, cellSize, hourglass);
      return;
    }
    drawBuildingModel(
      ctx,
      type,
      x + dx,
      y + dy,
      cellSize,
      owner,
      scale,
      teams[owner],
    );
    if (hpRatio <= DAMAGED_BUILDING_RATIO) {
      drawDamagedBuilding(ctx, x + dx, y + dy, cellSize);
    }

    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
    if (hourglass) drawHourglass(ctx, x + dx, y + dy, cellSize, hourglass);
    // Свой рудник или лесопилка: рабочий внутри или простой без него;
    // ратуша — значок только с укрытым рабочим.
    if (detail === 'detail' && owner === humanId) {
      if (staffed.has(id)) drawWorkBadge(ctx, x + dx, y + dy, cellSize);
      else if (building.role === 'resource')
        drawIdleBadge(ctx, x + dx, y + dy, cellSize);
    }
  });

  const unitList = Object.values(units);
  unitList.forEach(unit => {
    const { id, x, y, type, hp, maxHp, owner } = unit;
    if (isOutside(range, x, y)) return;
    const {
      dx = 0,
      dy = 0,
      scale = 1,
      hp: shown = hp,
    } = offsets?.get(id) ?? {};
    const hpRatio = shown / maxHp;

    const hourglass = hourglasses.get(id);
    // Сон и приказ занимают тот же угол: часы встают рядом.
    const shifted = !!(unit.restMode || unit.order);

    if (detail === 'icon') {
      drawRoleIcon(
        ctx,
        unit.role,
        x + dx,
        y + dy,
        cellSize,
        owner,
        teams[owner],
      );
      // Издалека сдвинутые часы уходят в соседнюю клетку: хватит значка.
      if (hourglass && !shifted) {
        drawHourglass(ctx, x + dx, y + dy, cellSize, hourglass);
      }
      if (owner === humanId) {
        drawRestBadge(ctx, x + dx, y + dy, cellSize, unit.restMode);
        drawOrderBadge(ctx, x + dx, y + dy, cellSize, unit.order);
      }
      return;
    }
    const motion = offsets?.get(id);
    drawUnitModel(
      ctx,
      type,
      x + dx,
      y + dy,
      cellSize,
      owner,
      scale,
      {
        arm: motion?.arm ?? (cocked.has(id) ? 1 : 0),
        loaded: motion?.loaded ?? true,
      },
      teams[owner],
    );
    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
    if (hourglass) {
      drawHourglass(ctx, x + dx, y + dy, cellSize, hourglass, shifted);
    }
    if (owner === humanId) {
      drawRestBadge(ctx, x + dx, y + dy, cellSize, unit.restMode);
      drawOrderBadge(ctx, x + dx, y + dy, cellSize, unit.order);
    }
    if (detail !== 'detail') return;
    if (owner === humanId) drawActionPips(ctx, x + dx, y + dy, cellSize, unit);
    // Строй — по видимым соседям, как предпросмотр урона.
    if (getResearchArmor(unit, unitList) > 0) {
      drawFormationBadge(ctx, x + dx, y + dy, cellSize);
    }
  });
};
