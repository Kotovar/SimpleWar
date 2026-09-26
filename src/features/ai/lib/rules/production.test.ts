import { describe, expect, it } from 'vite-plus/test';
import { grass, own, ownBuilding, scene } from '../scene.test-utils';
import { N01, N02 } from './production';

describe('N01/N02: найм', () => {
  it('N01 нанимает рабочего, пока их меньше нужного', () => {
    const base = ownBuilding('base', 3, 3);
    const { ctx } = scene({
      map: grass(8, 8),
      units: [own('worker', 0, 0)],
      buildings: [base],
    });

    expect(N01.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'N01',
        action: { type: 'spawn', buildingId: base.id, unitType: 'worker' },
      },
    ]);
  });

  it('N01 не нанимает без населения', () => {
    const { ctx } = scene({
      map: grass(8, 8),
      units: [own('worker', 0, 0)],
      buildings: [ownBuilding('base', 3, 3)],
      population: { max: 3, occupied: 3 },
    });

    expect(N01.evaluate(ctx)).toEqual([]);
  });

  it('N02 нанимает мечника в казармах, пока армии мало', () => {
    const barracks = ownBuilding('barracks', 5, 5);
    const { ctx } = scene({
      map: grass(8, 8),
      units: [own('worker', 0, 0), own('worker', 0, 1)],
      buildings: [ownBuilding('base', 1, 1), barracks],
    });

    expect(N02.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'N02',
        action: {
          type: 'spawn',
          buildingId: barracks.id,
          unitType: 'swordsman',
        },
      },
    ]);
  });

  it('N02 добавляет лучника к мечникам', () => {
    const { ctx } = scene({
      map: grass(8, 8),
      units: [own('worker', 0, 0), own('worker', 0, 1), own('swordsman', 7, 7)],
      buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 5, 5)],
    });

    expect(N02.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', unitType: 'archer' } },
    ]);
  });

  it('N02 не нанимает сверх нужной армии', () => {
    const { ctx } = scene({
      map: grass(8, 8),
      units: [
        own('worker', 0, 0),
        own('worker', 0, 1),
        own('swordsman', 7, 7),
        own('swordsman', 6, 7),
        own('archer', 7, 6),
      ],
      buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 4, 4)],
    });

    expect(N02.evaluate(ctx)).toEqual([]);
  });
});
