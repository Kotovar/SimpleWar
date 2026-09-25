import { describe, expect, it } from 'vite-plus/test';
import { BUILDINGS_CONFIG, type Resources } from '@shared/config';
import { canSpawnBuilding } from './canSpawnBuilding';

describe('canSpawnBuilding', () => {
  it('allows construction with exact resources and one build point', () => {
    expect(
      canSpawnBuilding('tower', BUILDINGS_CONFIG.tower.cost, 1),
    ).toMatchObject({ canSpawn: true, reason: 'none' });
  });

  it.each([
    {
      resources: {
        gold: BUILDINGS_CONFIG.tower.cost.gold - 1,
        wood: BUILDINGS_CONFIG.tower.cost.wood,
      },
    },
    {
      resources: {
        gold: BUILDINGS_CONFIG.tower.cost.gold,
        wood: BUILDINGS_CONFIG.tower.cost.wood - 1,
      },
    },
  ])('rejects a missing resource: $resources', ({ resources }) => {
    const available: Resources = resources;

    expect(canSpawnBuilding('tower', available, 1)).toMatchObject({
      canSpawn: false,
      reason: 'resources',
    });
  });

  it('rejects construction when the worker has no build points', () => {
    expect(
      canSpawnBuilding('tower', BUILDINGS_CONFIG.tower.cost, 0),
    ).toMatchObject({ canSpawn: false, reason: 'buildPoints' });
  });

  it('allows construction when build points are not part of the check', () => {
    expect(canSpawnBuilding('mine', BUILDINGS_CONFIG.mine.cost)).toMatchObject({
      canSpawn: true,
      reason: 'none',
    });
  });
});
