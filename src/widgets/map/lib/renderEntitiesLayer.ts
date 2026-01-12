import type { Building, Unit } from '@shared/config';
import {
  drawBarracks,
  drawBase,
  drawFarm,
  drawGoldMine,
  drawSawmill,
} from './drawBuildings';
import { drawArcher, drawSwordsman, drawWorker } from './drawUnits';
import { drawHpBar } from './drawHpBar';

export const renderEntitiesLayer = (
  ctx: CanvasRenderingContext2D,
  buildings: Record<string, Building>,
  units: Record<string, Unit>,
  cellSize: number,
) => {
  Object.values(buildings).forEach(building => {
    const { x, y, type, hp, maxHp, owner } = building;
    const hpRatio = hp / maxHp;

    if (type === 'base') {
      drawBase(ctx, x, y, cellSize, owner);
    }

    if (type === 'mine') {
      drawGoldMine(ctx, x, y, cellSize, owner);
    }

    if (type === 'sawmill') {
      drawSawmill(ctx, x, y, cellSize, owner);
    }

    if (type === 'farm') {
      drawFarm(ctx, x, y, cellSize, owner);
    }

    if (type === 'barracks') {
      drawBarracks(ctx, x, y, cellSize, owner);
    }

    drawHpBar(ctx, x, y, cellSize, hpRatio);
  });

  Object.values(units).forEach(unit => {
    const { x, y, type, hp, maxHp, owner } = unit;
    const hpRatio = hp / maxHp;

    if (type === 'swordsman') {
      drawSwordsman(ctx, x, y, cellSize, owner);
    }

    if (type === 'archer') {
      drawArcher(ctx, x, y, cellSize, owner);
    }

    if (type === 'worker') {
      drawWorker(ctx, x, y, cellSize, owner);
    }

    drawHpBar(ctx, x, y, cellSize, hpRatio);
  });
};
