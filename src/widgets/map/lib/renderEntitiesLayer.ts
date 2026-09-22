import type { Building, Unit } from '@shared/config';
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

/** Смещения в клетках для сущностей, которые сейчас анимируются. */
export type CellOffsets = Map<string, { dx: number; dy: number }>;

const SPENT_ALPHA = 0.45;

// Сущность игрока без очков действий гасим: видно, кем ещё можно ходить.
const isSpentUnit = (unit: Unit) =>
  unit.owner === 'player' &&
  unit.movePoints === 0 &&
  (unit.role === 'military' ? unit.attackPoints === 0 : unit.buildPoints === 0);

const isSpentBuilding = (building: Building) => {
  if (building.owner !== 'player') return false;
  if (building.role === 'combat') return building.attackPoints === 0;
  if (building.role === 'production') return building.spawnPoints === 0;

  return false;
};

export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  cellSize: number,
  offsets?: CellOffsets,
) => {
  Object.values(buildings).forEach(building => {
    const { id, x, y, type, hp, maxHp, owner } = building;
    const hpRatio = hp / maxHp;
    const { dx = 0, dy = 0 } = offsets?.get(id) ?? {};

    ctx.save();
    if (isSpentBuilding(building)) ctx.globalAlpha = SPENT_ALPHA;

    if (type === 'base') {
      drawBase(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'mine') {
      drawGoldMine(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'sawmill') {
      drawSawmill(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'farm') {
      drawFarm(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'barracks') {
      drawBarracks(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'tower') {
      drawTower(ctx, x + dx, y + dy, cellSize, owner);
    }
    ctx.restore();

    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
  });

  Object.values(units).forEach(unit => {
    const { id, x, y, type, hp, maxHp, owner } = unit;
    const hpRatio = hp / maxHp;
    const { dx = 0, dy = 0 } = offsets?.get(id) ?? {};

    ctx.save();
    if (isSpentUnit(unit)) ctx.globalAlpha = SPENT_ALPHA;

    if (type === 'swordsman') {
      drawSwordsman(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'archer') {
      drawArcher(ctx, x + dx, y + dy, cellSize, owner);
    }

    if (type === 'worker') {
      drawWorker(ctx, x + dx, y + dy, cellSize, owner);
    }
    ctx.restore();

    // Полоса здоровья остаётся контрастной даже у отходившего юнита.
    drawHpBar(ctx, x + dx, y + dy, cellSize, hpRatio);
  });
};
