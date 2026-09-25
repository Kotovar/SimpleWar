import { describe, expect, it } from 'vite-plus/test';
import { START_POPULATION_CAP_DEFAULT } from '@shared/config';
import type { SupplyBuilding } from '@shared/config';
import { calculateMaxPopulation } from './calculateMaxPopulation';

const farm = (x: number): SupplyBuilding => {
  return {
    id: 'farm-' + x,
    type: 'farm',
    x,
    y: 0,
    hp: 70,
    maxHp: 70,
    owner: 'player',
    role: 'supply',
    cost: { gold: 60, wood: 160 },
    populationSupply: 5,
  };
};

describe('calculateMaxPopulation', () => {
  it('returns the base capacity when there are no supply buildings', () => {
    expect(calculateMaxPopulation([])).toBe(START_POPULATION_CAP_DEFAULT);
  });

  it('adds the supply of every building to the base capacity', () => {
    expect(calculateMaxPopulation([farm(0), farm(1)])).toBe(
      START_POPULATION_CAP_DEFAULT + 10,
    );
  });
});
