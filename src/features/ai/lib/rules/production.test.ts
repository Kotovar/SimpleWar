import { describe, expect, it } from 'vite-plus/test';
import {
  grass,
  own,
  ownBuilding,
  remembered,
  scene,
} from '../scene.test-utils';
import { N01, N02 } from './production';
import { N03 } from './recruitment';

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

  it.each([
    [N02, 'swordsman'],
    [N03, 'spearman'],
  ] as const)(
    '%s пробует следующие казармы, если у первых нет места для найма',
    (rule, type) => {
      const blocked = ownBuilding('barracks', 0, 0);
      const available = ownBuilding('barracks', 5, 5);
      const { ctx } = scene({
        map: grass(20, 20),
        contacts: rule === N03 ? [remembered('rider', 19, 19)] : [],
        units: [own('worker', 7, 0), own('worker', 7, 1)],
        buildings: [
          ownBuilding('base', 6, 6),
          blocked,
          available,
          ownBuilding('farm', 0, 1),
          ownBuilding('farm', 1, 0),
          ownBuilding('farm', 1, 1),
        ],
      });
      expect(rule.evaluate(ctx)).toMatchObject([
        { action: { type: 'spawn', buildingId: available.id, unitType: type } },
      ]);
    },
  );

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

describe('N02: состав армии', () => {
  const army = [
    own('worker', 0, 0),
    own('worker', 0, 1),
    own('swordsman', 7, 7),
  ];

  it('копит на лучника, если хватит за несколько ходов, а не берёт мечника', () => {
    const { ctx } = scene({
      map: grass(8, 8),
      units: army,
      buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 5, 5)],
      stock: { gold: 210, wood: 500 },
    });

    expect(N02.evaluate(ctx)).toEqual([]);
  });

  it('берёт мечника, если на лучника копить слишком долго', () => {
    const { ctx } = scene({
      map: grass(8, 8),
      units: army,
      buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 5, 5)],
      stock: { gold: 200, wood: 0 },
    });

    expect(N02.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', unitType: 'swordsman' } },
    ]);
  });

  it('не нанимает в клетку, запертую своими зданиями', () => {
    const farms = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [2, 1],
      [1, 2],
      [3, 2],
      [2, 3],
    ].map(([x, y]) => ownBuilding('farm', x, y));
    const { ctx } = scene({
      map: grass(8, 8),
      units: [own('worker', 7, 0), own('worker', 7, 1)],
      buildings: [
        ownBuilding('base', 6, 6),
        ownBuilding('barracks', 1, 1),
        ...farms,
      ],
    });

    expect(N02.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', x: 0, y: 2 } },
    ]);
  });
});
