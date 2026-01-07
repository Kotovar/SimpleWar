import { CELL_SIZE, Unit } from '@shared/config';
import { drawBase } from './drawBuildings';
import { drawArcher, drawSwordsman } from './drawUnits';
import type { Building } from '@entities/buildings';
import { drawHpBar } from './drawHpBar';

export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
) => {
  Object.values(buildings).forEach(building => {
    const { x, y, type, hp, maxHp } = building;
    const hpRatio = hp / maxHp;
    if (type === 'base') {
      drawBase(ctx, x, y, CELL_SIZE);
      drawHpBar(ctx, x, y, CELL_SIZE, hpRatio);
    }
  });

  Object.values(units).forEach(unit => {
    const { x, y, type, hp, maxHp } = unit;
    const hpRatio = hp / maxHp;
    if (type === 'swordsman') {
      drawSwordsman(ctx, x, y, CELL_SIZE);
      drawHpBar(ctx, x, y, CELL_SIZE, hpRatio);
    }

    if (type === 'archer') {
      drawArcher(ctx, x, y, CELL_SIZE);
      drawHpBar(ctx, x, y, CELL_SIZE, hpRatio);
    }
  });
};
