import { Building, CELL_SIZE, Unit } from '@shared/config';
import { drawBase } from './drawBuildings';
import { drawArcher, drawSwordsman } from './drawUnits';
import { drawHpBar } from './drawHpBar';

export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
) => {
  Object.values(buildings).forEach(building => {
    const { x, y, type, hp, maxHp, owner } = building;
    const hpRatio = hp / maxHp;
    if (type === 'base') {
      drawBase(ctx, x, y, CELL_SIZE, owner);
      drawHpBar(ctx, x, y, CELL_SIZE, hpRatio);
    }
  });

  Object.values(units).forEach(unit => {
    const { x, y, type, hp, maxHp, owner } = unit;
    const hpRatio = hp / maxHp;
    if (type === 'swordsman') {
      drawSwordsman(ctx, x, y, CELL_SIZE, owner);
      drawHpBar(ctx, x, y, CELL_SIZE, hpRatio);
    }

    if (type === 'archer') {
      drawArcher(ctx, x, y, CELL_SIZE, owner);
      drawHpBar(ctx, x, y, CELL_SIZE, hpRatio);
    }
  });
};
