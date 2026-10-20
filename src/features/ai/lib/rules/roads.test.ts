import { describe, expect, it } from 'vite-plus/test';
import type { AiMemory } from '@entities/ai-memories';
import { foe, own, ownBuilding, remembered, scene } from '../scene.test-utils';
import { desiredWorkers } from '../facts';
import { D01, D02, planRoad } from './roads';

/** Ратуша слева, рудник на золоте справа: путь 9 клеток по полю. */
const field = ['............', '...........g', '............'];

const supply = (patch: Parameters<typeof scene>[0] = { map: field }) =>
  scene({
    buildings: [
      ownBuilding('base', 0, 1),
      ownBuilding('barracks', 0, 0),
      ownBuilding('mine', 11, 1),
    ],
    ...patch,
  });

const toMine: NonNullable<AiMemory['roadPlan']> = {
  ruleId: 'D01',
  target: { x: 11, y: 1 },
  cells: Array.from({ length: 10 }, (_, i) => ({ x: i + 1, y: 1 })),
  since: 5,
};

describe('planRoad: выбор дороги', () => {
  it('после казарм тянет дорогу к дальней добыче по закреплённой трассе', () => {
    const { ctx } = supply();
    const plan = planRoad(ctx)!;
    expect(plan).toMatchObject({ ruleId: 'D01', target: { x: 11, y: 1 } });
    // Трасса от соседней с ратушей клетки до клетки у рудника, без ратуши.
    expect(plan.cells).toHaveLength(10);
    expect(plan.cells.at(-1)).toEqual({ x: 10, y: 1 });
  });

  it('до казарм и к близкой добыче дорогу не тянет', () => {
    const early = scene({
      map: field,
      buildings: [ownBuilding('base', 0, 1), ownBuilding('mine', 11, 1)],
    });
    expect(planRoad(early.ctx)).toBeNull();

    const near = supply({ map: ['....', '...g', '....'] });
    expect(
      planRoad({
        ...near.ctx,
        obs: {
          ...near.ctx.obs,
          ownBuildings: near.ctx.obs.ownBuildings.map(b =>
            b.type === 'mine' ? { ...b, x: 3, y: 1 } : b,
          ),
        },
      }),
    ).toBeNull();
  });

  it('держит начатую дорогу и бросает достроенную', () => {
    const started = supply({ map: field, memory: { roadPlan: toMine } });
    expect(planRoad(started.ctx)).toBe(toMine);

    const done = supply({
      map: ['............', '==========.g', '............'],
      memory: { roadPlan: toMine },
    });
    // Не хватает одной клетки — дорога ещё нужна; новой не начать.
    expect(planRoad(done.ctx)).toBe(toMine);

    const finished = supply({
      map: ['............', '===========g', '............'],
      memory: { roadPlan: toMine },
    });
    expect(planRoad(finished.ctx)).toBeNull();
  });

  it('при наступлении тянет дорогу к фронту, но не к самому врагу', () => {
    const map = Array.from({ length: 3 }, () => '.'.repeat(30));
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('base', 0, 1), ownBuilding('barracks', 0, 0)],
      units: [1, 2, 3, 4].map(x => own('swordsman', x, 2)),
      contacts: [remembered('swordsman', 28, 1)],
      memory: {
        strategy: 'G08',
        operation: {
          phase: 'advance',
          target: { x: 28, y: 1 },
          rally: null,
          since: 1,
        },
      },
    });

    const plan = planRoad(ctx);
    expect(plan).toMatchObject({ ruleId: 'D02' });
    // Не дальше 12 клеток от ратуши и не ближе 6 к врагу.
    expect(plan!.target.x).toBeLessThanOrEqual(12);
    expect(28 - plan!.target.x).toBeGreaterThan(6);
  });
});

describe('D01: прокладка дороги к добыче', () => {
  it('рабочий рядом с трассой кладёт дорогу у ратуши первой', () => {
    const worker = own('worker', 1, 0);
    const { ctx } = supply({
      map: field,
      units: [worker],
      memory: { roadPlan: toMine },
    });

    expect(D01.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'D01',
        action: { type: 'buildRoad', workerId: worker.id, x: 1, y: 1 },
      },
    ]);
    expect(D02.evaluate(ctx)).toEqual([]);
  });

  it('строит с края готовой дороги, далёкий рабочий идёт к трассе', () => {
    const worker = own('worker', 6, 0);
    const { ctx } = supply({
      map: ['............', '======.....g', '............'],
      units: [worker],
      memory: { roadPlan: toMine },
    });

    // Ближайшая недостроенная клетка — (6, 1), прямо под рабочим.
    expect(D01.evaluate(ctx)).toMatchObject([
      { action: { type: 'buildRoad', x: 6, y: 1 } },
    ]);

    const far = own('worker', 10, 2);
    const scene2 = supply({
      map: field,
      units: [far],
      memory: { roadPlan: toMine },
    });
    expect(D01.evaluate(scene2.ctx)).toMatchObject([
      { action: { type: 'move', unitId: far.id } },
    ]);
  });

  it('не строит при тревоге у базы, без дерева и без свободного рабочего', () => {
    const memory = { roadPlan: toMine };
    const worker = own('worker', 1, 0);
    const alarm = supply({
      map: field,
      units: [worker],
      enemies: [foe('swordsman', 3, 2)],
      memory,
    });
    expect(D01.evaluate(alarm.ctx)).toEqual([]);

    const poor = supply({
      map: field,
      units: [worker],
      stock: { gold: 500, wood: 5 },
      memory,
    });
    expect(D01.evaluate(poor.ctx)).toEqual([]);

    const tired = supply({
      map: field,
      units: [own('worker', 1, 0, { buildPoints: 0 })],
      memory,
    });
    expect(D01.evaluate(tired.ctx)).toEqual([]);
  });
});

describe('рабочий под дорогу', () => {
  it('пока прокладывается дорога, ИИ держит рабочего сверх нормы', () => {
    const plain = supply();
    const withRoad = supply({ map: field, memory: { roadPlan: toMine } });
    expect(desiredWorkers(withRoad.ctx)).toBe(desiredWorkers(plain.ctx) + 1);
  });
});
