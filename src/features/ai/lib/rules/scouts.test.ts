import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  remembered,
  scene,
} from '../scene.test-utils';
import { R01, R02, R03 } from './scouts';

/** Левая половина разведана, правая — нет. */
const halfKnown = Array.from({ length: 12 }, () => '......??????');

describe('R01: разведка границы', () => {
  it('идёт к границе с неизвестным и берёт задачу', () => {
    const scout = own('scout', 1, 5);
    const { ctx } = scene({ map: halfKnown, units: [scout] });

    const [candidate] = R01.evaluate(ctx);

    expect(candidate).toMatchObject({ ruleId: 'R01', task: { ruleId: 'R01' } });
    expect(cellOf(candidate.action).x).toBeGreaterThan(scout.x);
  });

  it('на полностью разведанной карте не двигается', () => {
    const { ctx } = scene({ map: grass(12, 12), units: [own('scout', 1, 5)] });

    expect(R01.evaluate(ctx)).toEqual([]);
  });

  it('не идёт к границе под известной угрозой', () => {
    const map = Array.from({ length: 5 }, () => '....??');
    const { ctx } = scene({
      map,
      units: [own('scout', 0, 2)],
      enemies: [foe('archer', 3, 2)],
    });

    expect(R01.evaluate(ctx)).toEqual([]);
  });
});

describe('R02: поиск ресурса', () => {
  it('без известных мест добычи обследует границу', () => {
    const { ctx } = scene({
      map: halfKnown,
      units: [own('scout', 1, 5)],
      buildings: [ownBuilding('base', 2, 2)],
    });

    expect(R02.evaluate(ctx)).toMatchObject([{ ruleId: 'R02' }]);
  });

  it('ресурсы известны — поиск не нужен', () => {
    const map = halfKnown.map((row, y) => (y === 8 ? 'g.f...??????' : row));
    const { ctx } = scene({
      map,
      units: [own('scout', 1, 5)],
      buildings: [ownBuilding('base', 2, 2)],
    });

    expect(R02.evaluate(ctx)).toEqual([]);
  });
});

describe('R03: проверка контакта', () => {
  it('идёт к последнему месту врага', () => {
    const scout = own('scout', 1, 1);
    const contact = remembered('swordsman', 9, 9, 'stale');
    const { ctx } = scene({
      map: grass(12, 12),
      units: [scout],
      contacts: [contact],
    });

    const [candidate] = R03.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), contact)).toBeLessThan(
      manhattan(scout, contact),
    );
  });

  it('без контактов не двигается', () => {
    const { ctx } = scene({ map: grass(12, 12), units: [own('scout', 1, 1)] });

    expect(R03.evaluate(ctx)).toEqual([]);
  });
});

describe('R01: не входит под удар', () => {
  it('шаг к границе под угрозой не предлагается', () => {
    const map = Array.from({ length: 6 }, () => '........????');
    const { ctx } = scene({
      map,
      units: [own('scout', 0, 2, { id: 'sc' })],
      enemies: [foe('swordsman', 7, 2)],
      memory: {
        tasks: [
          {
            id: 't1',
            kind: 'scout',
            ruleId: 'R01',
            unitId: 'sc',
            target: { x: 7, y: 4 },
            reserve: { gold: 0, wood: 0 },
            createdTurn: 1,
            reviewTurn: 20,
          },
        ],
      },
    });

    expect(R01.evaluate(ctx)).toEqual([]);
  });
});
