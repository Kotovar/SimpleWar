import { describe, expect, it } from 'vite-plus/test';
import {
  BuildingType,
  COMBAT_BUILDINGS_CONFIG,
  PRODUCTION_BUILDINGS_CONFIG,
  RESOURCE_BUILDINGS_CONFIG,
  SUPPLY_BUILDINGS_CONFIG,
} from '@shared/config';
import { createBuilding } from './createBuilding';

const buildingCases = [
  {
    type: 'base',
    role: 'production',
    config: PRODUCTION_BUILDINGS_CONFIG.base,
    x: 2,
    y: 5,
    owner: 'p1',
  },
  {
    type: 'barracks',
    role: 'production',
    config: PRODUCTION_BUILDINGS_CONFIG.barracks,
    x: 3,
    y: 6,
    owner: 'p2',
  },
  {
    type: 'mine',
    role: 'resource',
    config: RESOURCE_BUILDINGS_CONFIG.mine,
    x: 4,
    y: 7,
    owner: 'p1',
  },
  {
    type: 'sawmill',
    role: 'resource',
    config: RESOURCE_BUILDINGS_CONFIG.sawmill,
    x: 5,
    y: 8,
    owner: 'p2',
  },
  {
    type: 'farm',
    role: 'supply',
    config: SUPPLY_BUILDINGS_CONFIG.farm,
    x: 6,
    y: 9,
    owner: 'p1',
  },
  {
    type: 'tower',
    role: 'combat',
    config: COMBAT_BUILDINGS_CONFIG.tower,
    x: 7,
    y: 10,
    owner: 'p2',
  },
] as const;

describe('createBuilding', () => {
  it.each(buildingCases)(
    'создаёт здание $type из его конфига',
    ({ type, role, config, x, y, owner }) => {
      const building = createBuilding(type, x, y, owner);

      expect(building).toMatchObject({
        ...config,
        id: expect.stringMatching(/^building_.+/),
        type,
        x,
        y,
        owner,
        hp: config.maxHp,
        role,
      });
    },
  );

  it('возвращает null для неизвестного типа', () => {
    expect(createBuilding('unknown' as BuildingType, 0, 0, 'p1')).toBeNull();
  });
});
