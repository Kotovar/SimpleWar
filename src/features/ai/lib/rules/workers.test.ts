import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  scene,
} from '../scene.test-utils';
import { W01, W02, W03, W04, W05 } from './workers';

describe('W01: эвакуация рабочего', () => {
  it('уводит рабочего из зоны угрозы', () => {
    const worker = own('worker', 5, 5);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [worker],
      enemies: [foe('swordsman', 7, 5)],
    });

    const [candidate] = W01.evaluate(ctx);

    expect(candidate.action).toMatchObject({
      type: 'move',
      unitId: worker.id,
    });
    expect(ctx.threatAt(cellOf(candidate.action))).toBe(0);
  });

  it('не двигает рабочего без угрозы', () => {
    const { ctx } = scene({ map: grass(12, 12), units: [own('worker', 5, 5)] });

    expect(W01.evaluate(ctx)).toEqual([]);
  });

  it('не предлагает движение без очков', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('worker', 5, 5, { movePoints: 0 })],
      enemies: [foe('swordsman', 7, 5)],
    });

    expect(W01.evaluate(ctx)).toEqual([]);
  });
});

describe('W02/W03: занять место добычи', () => {
  const map = ['........', '........', '........', '...g....', '........'];

  it('W02 назначает соседнего рабочего на свободный рудник', () => {
    const mine = ownBuilding('mine', 3, 3);
    const worker = own('worker', 4, 4);
    const { ctx } = scene({ map, units: [worker], buildings: [mine] });

    expect(W02.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'W02',
        action: { type: 'assign', workerId: worker.id, buildingId: mine.id },
      },
    ]);
  });

  it('W02 не назначает на рудник под угрозой', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 4, 4)],
      buildings: [ownBuilding('mine', 3, 3)],
      enemies: [foe('swordsman', 6, 3)],
    });

    expect(W02.evaluate(ctx)).toEqual([]);
  });

  it('W02 пропускает рудник, который уже обслуживается', () => {
    const mine = ownBuilding('mine', 3, 3);
    const { ctx } = scene({
      map,
      units: [
        own('worker', 2, 2, { workplaceId: mine.id }),
        own('worker', 4, 4),
      ],
      buildings: [mine],
    });

    expect(W02.evaluate(ctx)).toEqual([]);
  });

  it('W03 ведёт далёкого рабочего к лесопилке', () => {
    const sawmill = ownBuilding('sawmill', 1, 1);
    const worker = own('worker', 7, 4);
    const { ctx } = scene({
      map: ['........', '.f......', '........', '........', '........'],
      units: [worker],
      buildings: [sawmill],
    });

    const [candidate] = W03.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'W03',
      action: { type: 'move', unitId: worker.id },
    });
    expect(manhattan(cellOf(candidate.action), sawmill)).toBeLessThan(
      manhattan(worker, sawmill),
    );
  });

  it('W03 молчит без лесопилки', () => {
    const { ctx } = scene({ map, units: [own('worker', 4, 4)] });

    expect(W03.evaluate(ctx)).toEqual([]);
  });
});

describe('W04: поиск ресурса рабочим', () => {
  const unexplored = Array.from({ length: 10 }, () => '.......???');

  it('ведёт рабочего к границе разведки, пока золото не найдено', () => {
    const worker = own('worker', 3, 5);
    const { ctx } = scene({
      map: unexplored,
      units: [worker],
      buildings: [ownBuilding('base', 2, 5)],
    });

    const [candidate] = W04.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'W04',
      action: { type: 'move', unitId: worker.id },
    });
    expect(cellOf(candidate.action).x).toBeGreaterThan(worker.x);
  });

  it('не ищет, когда нужный ресурс уже известен', () => {
    const map = [...unexplored];
    map[1] = '.g.....???';
    const { ctx } = scene({
      map,
      units: [own('worker', 3, 5)],
      buildings: [ownBuilding('base', 2, 5)],
    });

    expect(W04.evaluate(ctx)).toEqual([]);
  });
});

describe('W05: новая добыча', () => {
  const map = ['..........', '..........', '.....g....', '..........'];

  it('строит рудник на известном золоте', () => {
    const worker = own('worker', 4, 2);
    const { ctx } = scene({
      map,
      units: [worker],
      buildings: [ownBuilding('base', 1, 2)],
    });

    expect(W05.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'W05',
        action: { type: 'build', buildingType: 'mine', x: 5, y: 2 },
      },
    ]);
  });

  it('не начинает стройку без ресурсов', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 4, 2)],
      buildings: [ownBuilding('base', 1, 2)],
      stock: { gold: 100, wood: 500 },
    });

    expect(W05.evaluate(ctx)).toEqual([]);
  });
});
