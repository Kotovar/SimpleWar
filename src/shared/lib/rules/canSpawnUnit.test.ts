import { describe, expect, it } from 'vite-plus/test';
import {
  UNITS_CONFIG,
  type PopulationCap,
  type Resources,
} from '@shared/config';
import { canSpawnUnit } from './canSpawnUnit';

describe('canSpawnUnit', () => {
  it('allows recruitment when cost, population and spawn points are exact', () => {
    const unit = UNITS_CONFIG.swordsman;
    const population: PopulationCap = { occupied: 2, max: 4 };

    expect(canSpawnUnit('swordsman', unit.cost, population, 1)).toMatchObject({
      canSpawn: true,
      reason: 'none',
    });
  });

  it.each([
    {
      resources: {
        gold: UNITS_CONFIG.archer.cost.gold - 1,
        wood: UNITS_CONFIG.archer.cost.wood,
      },
    },
    {
      resources: {
        gold: UNITS_CONFIG.archer.cost.gold,
        wood: UNITS_CONFIG.archer.cost.wood - 1,
      },
    },
  ])(
    'rejects a missing resource without another failing condition: $resources',
    ({ resources }) => {
      const population: PopulationCap = { occupied: 0, max: 10 };
      const available: Resources = resources;

      expect(canSpawnUnit('archer', available, population, 1)).toMatchObject({
        canSpawn: false,
        reason: 'resources',
      });
    },
  );

  it('rejects recruitment one population point over the limit', () => {
    const unit = UNITS_CONFIG.swordsman;
    const population: PopulationCap = {
      occupied: 3,
      max: 4,
    };

    expect(canSpawnUnit('swordsman', unit.cost, population, 1)).toMatchObject({
      canSpawn: false,
      reason: 'population',
    });
  });

  it('rejects recruitment when the building has no spawn points', () => {
    const population: PopulationCap = { occupied: 0, max: 10 };

    expect(
      canSpawnUnit('worker', UNITS_CONFIG.worker.cost, population, 0),
    ).toMatchObject({ canSpawn: false, reason: 'spawnPoints' });
  });

  it('allows recruitment when spawn points are not part of the check', () => {
    const population: PopulationCap = { occupied: 0, max: 10 };

    expect(
      canSpawnUnit('worker', UNITS_CONFIG.worker.cost, population),
    ).toMatchObject({ canSpawn: true, reason: 'none' });
  });
});
