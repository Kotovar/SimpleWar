import { describe, expect, it } from 'vite-plus/test';
import { createBuilding } from '@entities/buildings';
import type { Building, BuildingType } from '@shared/config';
import { calculateIncome } from './calculateIncome';

const building = (type: BuildingType, x: number): Building => {
  const result = createBuilding(type, x, 0, 'player');
  if (!result) throw new Error('Не удалось создать здание ' + type);
  return result;
};

describe('calculateIncome', () => {
  it('returns zero income for an empty list', () => {
    expect(calculateIncome([])).toEqual({ gold: 0, wood: 0 });
  });

  it('sums partial income and leaves the buildings unchanged', () => {
    const buildings = [
      building('base', 0),
      building('mine', 1),
      building('sawmill', 2),
      building('farm', 3),
    ];
    const before = structuredClone(buildings);

    expect(calculateIncome(buildings)).toEqual({ gold: 18, wood: 15 });
    expect(buildings).toEqual(before);
  });
});
