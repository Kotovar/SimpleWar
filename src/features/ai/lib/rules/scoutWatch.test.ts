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
import { R04, R05, R06 } from './scoutWatch';

describe('R04: наблюдение', () => {
  it('держится у группы врага вне её удара', () => {
    const { ctx } = scene({
      map: grass(16, 16),
      units: [own('scout', 5, 5)],
      enemies: [foe('swordsman', 9, 5), foe('swordsman', 9, 6)],
    });

    const [candidate] = R04.evaluate(ctx);

    expect(candidate.ruleId).toBe('R04');
    expect(ctx.threatAt(cellOf(candidate.action), 'scout')).toBe(0);
  });

  it('одиночный враг — не группа', () => {
    const { ctx } = scene({
      map: grass(16, 16),
      units: [own('scout', 5, 5)],
      enemies: [foe('swordsman', 9, 5)],
    });

    expect(R04.evaluate(ctx)).toEqual([]);
  });

  it('отметка удара у своего здания без видимого орудия — обзор на место наводки', () => {
    const mark = { x: 6, y: 6 };
    const scout = own('scout', 1, 1);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [scout],
      buildings: [ownBuilding('farm', 6, 6)],
      strikes: [mark],
    });

    const [candidate] = R04.evaluate(ctx);

    expect(candidate.reason).toBe('слежу за местом наводки');
    expect(manhattan(cellOf(candidate.action), mark)).toBeLessThan(
      manhattan(scout, mark),
    );
  });

  it('орудие видно — наводку искать не нужно', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('scout', 1, 1)],
      buildings: [ownBuilding('farm', 6, 6)],
      enemies: [foe('siege', 9, 9)],
      strikes: [{ x: 6, y: 6 }],
    });

    expect(R04.evaluate(ctx)).toEqual([]);
  });
});

describe('R05: проверка фланга', () => {
  it('перед наступлением идёт к невидимой клетке у цели', () => {
    const target = { x: 10, y: 10 };
    const hidden = [];
    for (let y = 5; y < 12; y++)
      for (let x = 5; x < 12; x++) hidden.push(`${x},${y}`);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('scout', 1, 1)],
      hidden,
      memory: {
        operation: { phase: 'gather', target, rally: null, since: 1 },
      },
    });

    expect(R05.evaluate(ctx)).toMatchObject([{ ruleId: 'R05' }]);
  });

  it('без цели наступления фланг не проверяет', () => {
    const { ctx } = scene({ map: grass(12, 12), units: [own('scout', 1, 1)] });

    expect(R05.evaluate(ctx)).toEqual([]);
  });
});

describe('R06: уклонение', () => {
  it('под угрозой уходит, не атакуя', () => {
    const scout = own('scout', 5, 5);
    const { ctx } = scene({
      map: grass(16, 16),
      units: [scout],
      enemies: [foe('swordsman', 6, 5)],
    });

    const [candidate] = R06.evaluate(ctx);

    expect(candidate.action.type).toBe('move');
    expect(ctx.threatAt(cellOf(candidate.action), 'scout')).toBeLessThan(
      ctx.threatAt(scout, 'scout'),
    );
  });

  it('без угрозы стоит', () => {
    const { ctx } = scene({
      map: grass(16, 16),
      units: [own('scout', 1, 1)],
      enemies: [foe('swordsman', 14, 14)],
    });

    expect(R06.evaluate(ctx)).toEqual([]);
  });
});
