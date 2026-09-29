import { describe, expect, it } from 'vite-plus/test';
import { expansionWanted, savingGoals } from './saving';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';
import { W06 } from './rules/farms';
import { W05 } from './rules/workers';

/** Рост экономики: расширение добычи и ферма без свободного рабочего. */

/** Поле с золотом и лесом в стороне от базы. */
const map = grass(14, 14).map((row, y) => (y === 10 ? 'g.g.f.f.......' : row));
const mine = () => ownBuilding('mine', 0, 10);
const worker = (x: number, y: number, workplaceId: string | null = null) =>
  own('worker', x, y, { workplaceId });

describe('expansionWanted: расширение добычи', () => {
  it('к 20-му ходу нужен второй рудник, если есть площадка', () => {
    const m = mine();
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id)],
      buildings: [ownBuilding('base', 5, 5), m],
      turn: 20,
    });

    expect(expansionWanted(ctx, 'mine')).toBe(true);
  });

  it('в начале партии второй рудник не нужен', () => {
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('base', 5, 5), mine()],
      turn: 5,
    });

    expect(expansionWanted(ctx, 'mine')).toBe(false);
  });

  it('пока рудник простаивает, новый не нужен', () => {
    const idle = mine();
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('base', 5, 5), idle],
      turn: 40,
    });

    expect(expansionWanted(ctx, 'mine')).toBe(false);
  });
});

describe('savingGoals: порядок', () => {
  it('население заполнено — ферма раньше здания найма', () => {
    const { ctx } = scene({
      map,
      units: [
        worker(1, 1),
        worker(2, 1),
        worker(0, 10, 'mine-1'),
        ...[0, 1, 2, 3].map(i => own('swordsman', i, 13)),
      ],
      buildings: [
        ownBuilding('base', 5, 5),
        ownBuilding('barracks', 8, 8),
        ownBuilding('mine', 0, 10, { id: 'mine-1' }),
        ownBuilding('sawmill', 4, 10),
      ],
      enemies: [foe('base', 13, 0)],
      population: { max: 10, occupied: 10 },
    });

    expect(savingGoals(ctx)[0].key).toBe('farm');
  });
});

describe('W05: второй рудник при запасе', () => {
  it('строит рудник по расширению, даже если золота хватает на траты', () => {
    const m = mine();
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id), worker(3, 9)],
      buildings: [ownBuilding('base', 5, 5), m, ownBuilding('barracks', 8, 8)],
      stock: { gold: 2000, wood: 2000 },
      turn: 25,
    });

    expect(W05.evaluate(ctx)[0]?.basis).toMatchObject({ building: 'mine' });
  });
});

describe('W06: ферма без свободного рабочего', () => {
  it('население заполнено — снимает рабочего с добычи с задачей фермы', () => {
    const m = mine();
    const miner = worker(0, 10, m.id);
    const { ctx } = scene({
      map,
      units: [miner],
      buildings: [ownBuilding('base', 5, 5), m],
      population: { max: 10, occupied: 10 },
    });

    expect(W06.evaluate(ctx)).toMatchObject([
      {
        action: { type: 'unassign', workerId: miner.id },
        task: { ruleId: 'W06', buildingType: 'farm' },
      },
    ]);
  });

  it('есть место для найма — рабочего с добычи не снимает', () => {
    const m = mine();
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id)],
      buildings: [ownBuilding('base', 5, 5), m],
      population: { max: 10, occupied: 8 },
    });

    expect(
      W06.evaluate(ctx).some(({ action }) => action.type === 'unassign'),
    ).toBe(false);
  });

  it('ферму не на что строить — рабочий остаётся на добыче', () => {
    const m = mine();
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id)],
      buildings: [ownBuilding('base', 5, 5), m],
      population: { max: 10, occupied: 10 },
      stock: { gold: 0, wood: 0 },
    });

    expect(W06.evaluate(ctx)).toEqual([]);
  });
});
