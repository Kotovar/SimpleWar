import { describe, expect, it } from 'vite-plus/test';
import { foe, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { W06, W07, W08, W09 } from './construction';

describe('W06: ферма', () => {
  it('строит ферму, когда население почти исчерпано', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('worker', 5, 7)],
      buildings: [ownBuilding('base', 5, 5)],
      population: { max: 10, occupied: 8 },
    });

    const [candidate] = W06.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'W06',
      basis: { building: 'farm' },
    });
  });

  it('не строит ферму при запасе населения', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('worker', 5, 7)],
      buildings: [ownBuilding('base', 5, 5)],
    });

    expect(W06.evaluate(ctx)).toEqual([]);
  });
});

describe('W07: казармы и башня', () => {
  it('строит первые казармы', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('worker', 5, 7)],
      buildings: [ownBuilding('base', 5, 5)],
    });

    expect(W07.evaluate(ctx)).toMatchObject([
      { ruleId: 'W07', basis: { building: 'barracks' } },
    ]);
  });

  it('при стратегии обороны строит башню', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [
        own('worker', 5, 7),
        own('worker', 4, 7),
        own('swordsman', 1, 1),
        own('swordsman', 1, 2),
        own('swordsman', 1, 3),
      ],
      buildings: [ownBuilding('base', 5, 5), ownBuilding('barracks', 8, 8)],
      stock: { gold: 200, wood: 500 },
      memory: { strategy: 'G10' },
    });

    expect(W07.evaluate(ctx)).toMatchObject([
      { ruleId: 'W07', basis: { building: 'tower' } },
    ]);
  });

  it('с казармами и без угрозы новых зданий не строит', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('worker', 5, 7)],
      buildings: [ownBuilding('base', 5, 5), ownBuilding('barracks', 8, 8)],
      stock: { gold: 100, wood: 500 },
    });

    expect(W07.evaluate(ctx)).toEqual([]);
  });
});

describe('W08: ремонт', () => {
  it('чинит повреждённую ратушу соседним рабочим', () => {
    const base = ownBuilding('base', 5, 5, { hp: 300 });
    const worker = own('worker', 6, 6);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [worker],
      buildings: [base],
    });

    expect(W08.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'W08',
        action: { type: 'repair', workerId: worker.id, buildingId: base.id },
      },
    ]);
  });

  it('не чинит под угрозой', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('worker', 6, 6)],
      buildings: [ownBuilding('base', 5, 5, { hp: 300 })],
      enemies: [foe('swordsman', 5, 8)],
    });

    expect(W08.evaluate(ctx)).toEqual([]);
  });
});

describe('W09: восстановление добычи', () => {
  const map = ['..........', '..........', '..........', '...g......'];

  it('отстраивает разрушенный рудник на старом месте', () => {
    const worker = own('worker', 4, 2);
    const { ctx } = scene({
      map,
      units: [worker],
      buildings: [ownBuilding('base', 8, 1)],
      memory: {
        lastWorkplace: {
          [worker.id]: { buildingId: 'lost', type: 'mine', x: 3, y: 3 },
        },
      },
    });

    expect(W09.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'W09',
        action: { type: 'build', buildingType: 'mine', x: 3, y: 3 },
      },
    ]);
  });

  it('не отстраивает место под угрозой', () => {
    const worker = own('worker', 4, 2);
    const { ctx } = scene({
      map,
      units: [worker],
      buildings: [ownBuilding('base', 8, 1)],
      enemies: [foe('swordsman', 1, 3)],
      memory: {
        lastWorkplace: {
          [worker.id]: { buildingId: 'lost', type: 'mine', x: 3, y: 3 },
        },
      },
    });

    expect(W09.evaluate(ctx)).toEqual([]);
  });
});
