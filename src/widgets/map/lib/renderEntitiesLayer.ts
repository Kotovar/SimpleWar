import { CELL_SIZE, Unit } from '@shared/config';
import { drawBase } from './drawBuildings';
import { drawSwordsman } from './drawUnits';
import type { Building } from '@entities/buildings';

export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
) => {
  Object.values(buildings).forEach(building => {
    const { x, y, type } = building;
    if (type === 'base') drawBase(ctx, x, y, CELL_SIZE);
  });

  Object.values(units).forEach(unit => {
    const { x, y, type } = unit;
    if (type === 'swordsman') drawSwordsman(ctx, x, y, CELL_SIZE);
  });
};
