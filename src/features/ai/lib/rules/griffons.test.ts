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
import { F01, F02, F03, F04 } from './griffons';

const map = grass(16, 16);

describe('F01: воздушная разведка', () => {
  // Граница за водой: по земле пути нет.
  const lake = Array.from({ length: 8 }, () => '....wwww....????');

  it('летит к границе, недоступной по земле', () => {
    const griffon = own('griffon', 2, 3);
    const { ctx } = scene({
      map: lake,
      units: [griffon],
      buildings: [ownBuilding('base', 0, 0)],
    });

    const [candidate] = F01.evaluate(ctx);

    expect(cellOf(candidate.action).x).toBeGreaterThan(griffon.x);
  });

  it('граница доступна по земле рядом — воздух не нужен', () => {
    const near = Array.from({ length: 8 }, () => '........????????');
    const { ctx } = scene({
      map: near,
      units: [own('griffon', 2, 3)],
      buildings: [ownBuilding('base', 0, 0)],
    });

    expect(F01.evaluate(ctx)).toEqual([]);
  });

  it('летает над водой: цель хода может быть за водой', () => {
    const griffon = own('griffon', 3, 3);
    const { ctx } = scene({
      map: lake,
      units: [griffon],
      buildings: [ownBuilding('base', 0, 0)],
    });

    const [candidate] = F01.evaluate(ctx);

    expect(cellOf(candidate.action).x).toBeGreaterThanOrEqual(4);
  });
});

describe('F02: воздушный рейд', () => {
  it('бьёт рабочего без ПВО', () => {
    const worker = foe('worker', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('griffon', 5, 5)],
      enemies: [worker],
    });

    expect(F02.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: worker.id } },
    ]);
  });

  it('рабочий под лучником — рейда нет', () => {
    const { ctx } = scene({
      map,
      units: [own('griffon', 5, 5)],
      enemies: [foe('worker', 6, 5), foe('archer', 8, 5)],
    });

    expect(F02.evaluate(ctx)).toEqual([]);
  });
});

describe('F03: воздушный перехват', () => {
  it('летит на помощь базе', () => {
    const enemy = foe('swordsman', 5, 5);
    const griffon = own('griffon', 14, 14);
    const { ctx } = scene({
      map,
      units: [griffon],
      buildings: [ownBuilding('base', 3, 5)],
      enemies: [enemy],
    });

    const [candidate] = F03.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), enemy)).toBeLessThan(
      manhattan(griffon, enemy),
    );
  });

  it('без тревоги у базы не перехватывает', () => {
    const { ctx } = scene({
      map,
      units: [own('griffon', 14, 14)],
      buildings: [ownBuilding('base', 3, 5)],
    });

    expect(F03.evaluate(ctx)).toEqual([]);
  });
});

describe('F04: уход от ПВО', () => {
  it('сильная ПВО рядом — отступает', () => {
    const griffon = own('griffon', 5, 5);
    const { ctx } = scene({
      map,
      units: [griffon],
      enemies: [foe('archer', 7, 5), foe('archer', 7, 6)],
    });

    const [candidate] = F04.evaluate(ctx);

    expect(ctx.threatAt(cellOf(candidate.action), 'griffon')).toBeLessThan(
      ctx.threatAt(griffon, 'griffon'),
    );
  });

  it('мечники воздух не бьют — не угроза', () => {
    const { ctx } = scene({
      map,
      units: [own('griffon', 5, 5)],
      enemies: [foe('swordsman', 6, 5), foe('swordsman', 5, 6)],
    });

    expect(F04.evaluate(ctx)).toEqual([]);
  });
});

describe('F01: штурм с группой', () => {
  const operation = {
    phase: 'advance' as const,
    target: { x: 7, y: 5 },
    rally: null,
    since: 1,
  };

  it('рядом с ратушей врага атакует её, а не отходит за мечника', () => {
    const base = foe('base', 7, 5);
    const { ctx } = scene({
      map,
      units: [own('griffon', 6, 5), own('swordsman', 3, 5)],
      enemies: [base],
      memory: { operation },
    });

    expect(F01.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: base.id } },
    ]);
  });

  it('вне дальности наступает на цель операции', () => {
    const griffon = own('griffon', 1, 5);
    const { ctx } = scene({
      map,
      units: [griffon, own('swordsman', 3, 5)],
      enemies: [foe('base', 12, 5)],
      memory: { operation: { ...operation, target: { x: 12, y: 5 } } },
    });

    const [candidate] = F01.evaluate(ctx);

    expect(cellOf(candidate.action).x).toBeGreaterThan(3);
  });
});
