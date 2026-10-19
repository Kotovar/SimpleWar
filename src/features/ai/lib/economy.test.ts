import { describe, expect, it } from 'vite-plus/test';
import { expansionWanted, savingGoals } from './saving';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';
import { W06 } from './rules/farms';
import { W02, W05 } from './rules/workers';
import { W07 } from './rules/construction';
import { decideStep } from './decide';

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

  it('второй рудник — стартовая цель с начала партии', () => {
    const m = mine();
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id)],
      buildings: [ownBuilding('base', 5, 5), m],
      turn: 2,
    });

    expect(expansionWanted(ctx, 'mine')).toBe(true);
  });

  it('сверх стартовой цели — только нехватающий ресурс', () => {
    const goldMap = grass(14, 14).map((row, y) =>
      y === 10 ? 'g.g.g.f.......' : row,
    );
    const mines = [0, 2].map(x => ownBuilding('mine', x, 10));
    const { ctx } = scene({
      map: goldMap,
      units: mines.map(m => worker(m.x, m.y, m.id)),
      buildings: [ownBuilding('base', 5, 5), ...mines],
      // Золота с избытком, дерева нет: третий рудник не нужен.
      stock: { gold: 5000, wood: 0 },
      turn: 30,
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

describe('savingGoals: дебют', () => {
  it('без казарм копит на стартовую добычу раньше казарм', () => {
    const m = mine();
    const sawmill = ownBuilding('sawmill', 4, 10);
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id), worker(4, 10, sawmill.id), worker(5, 6)],
      buildings: [ownBuilding('base', 5, 5), m, sawmill],
      turn: 4,
    });

    expect(savingGoals(ctx)[0].key).toBe('mine');
  });

  it('с лесопилкой нанимает рабочих до нормы раньше казарм', () => {
    const m = mine();
    const sawmill = ownBuilding('sawmill', 4, 10);
    const { ctx } = scene({
      map,
      units: [worker(0, 10, m.id), worker(4, 10, sawmill.id)],
      buildings: [ownBuilding('base', 5, 5), m, sawmill],
      turn: 4,
    });

    expect(savingGoals(ctx)[0].key).toBe('worker');
  });
});

describe('W07: казармы после стартовой добычи', () => {
  it('пока стартовая добыча не набрана, казармы не начинает', () => {
    const m = mine();
    const sawmill = ownBuilding('sawmill', 4, 10);
    const units = [
      worker(0, 10, m.id),
      worker(4, 10, sawmill.id),
      worker(5, 7),
    ];
    const opening = scene({
      map,
      units,
      buildings: [ownBuilding('base', 5, 5), m, sawmill],
      stock: { gold: 500, wood: 500 },
      turn: 4,
    });
    expect(W07.evaluate(opening.ctx)).toEqual([]);

    const second = [2, 6].map(x =>
      ownBuilding(x === 2 ? 'mine' : 'sawmill', x, 10),
    );
    const done = scene({
      map,
      units: [...units, ...second.map(b => worker(b.x, b.y, b.id))],
      buildings: [ownBuilding('base', 5, 5), m, sawmill, ...second],
      stock: { gold: 500, wood: 500 },
      turn: 4,
    });
    expect(W07.evaluate(done.ctx)).toMatchObject([
      { basis: { building: 'barracks' } },
    ]);
  });
});

describe('W02 и привязка шагов в ходу', () => {
  it('рабочий, уже сдвинутый другим правилом, не занимает место — идёт другой', () => {
    const idle = mine();
    const first = worker(5, 6);
    const second = worker(9, 9);
    const { ctx } = scene({
      map,
      units: [first, second],
      buildings: [ownBuilding('base', 5, 5), idle],
    });
    ctx.turn.movedBy.set(first.id, { ruleId: 'W01', group: 'defense' });

    expect(decideStep(ctx, [W02]).chosen).toMatchObject({
      ruleId: 'W02',
      actorId: second.id,
    });
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

  it('рабочих по норме — снимает с добычи и при месте для найма', () => {
    const mines = [0, 2].map(x => ownBuilding('mine', x, 10));
    const sawmill = ownBuilding('sawmill', 4, 10);
    const miners = [...mines, sawmill].map(b => worker(b.x, b.y, b.id));
    const { ctx } = scene({
      map,
      units: [...miners, worker(6, 10, sawmill.id)],
      buildings: [ownBuilding('base', 5, 5), ...mines, sawmill],
      population: { max: 10, occupied: 8 },
      stock: { gold: 500, wood: 500 },
    });

    expect(W06.evaluate(ctx)).toMatchObject([
      { action: { type: 'unassign' }, task: { buildingType: 'farm' } },
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
