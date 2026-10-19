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
import { C01, C02, C03, C04 } from './riders';
import { C05, C06 } from './riderMoves';

const map = grass(16, 16);

describe('C01: рейд по рабочим', () => {
  it('бьёт незащищённого рабочего рядом', () => {
    const worker = foe('worker', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('rider', 5, 5)],
      enemies: [worker],
    });

    expect(C01.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: worker.id } },
    ]);
  });

  it('рабочий под охраной — рейда нет', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 5, 5)],
      enemies: [foe('worker', 6, 5), foe('spearman', 7, 5)],
    });

    expect(C01.evaluate(ctx)).toEqual([]);
  });
});

describe('C02: удар во фланг', () => {
  it('подходит к стрелку без копейщиков', () => {
    const archer = foe('archer', 10, 5);
    const rider = own('rider', 5, 5);
    const { ctx } = scene({ map, units: [rider], enemies: [archer] });

    const [candidate] = C02.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), archer)).toBeLessThanOrEqual(1);
  });

  it('стрелок прикрыт копейщиком — фланг закрыт', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 5, 5)],
      enemies: [foe('archer', 10, 5), foe('spearman', 11, 5)],
    });

    expect(C02.evaluate(ctx)).toEqual([]);
  });
});

describe('C03: перехват быстрого врага', () => {
  it('перехватывает всадника у своих рабочих', () => {
    const raider = foe('rider', 8, 5);
    const rider = own('rider', 3, 5);
    const { ctx } = scene({
      map,
      units: [rider, own('worker', 5, 8)],
      enemies: [raider],
    });

    const [candidate] = C03.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), raider)).toBeLessThan(
      manhattan(rider, raider),
    );
  });

  it('далёкий от экономики враг — не перехват', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 3, 5), own('worker', 1, 1)],
      enemies: [foe('rider', 14, 14)],
    });

    expect(C03.evaluate(ctx)).toEqual([]);
  });
});

describe('C04: преследование', () => {
  it('добивает ослабленного врага', () => {
    const weak = foe('swordsman', 6, 5, { hp: 20 });
    const { ctx } = scene({
      map,
      units: [own('rider', 5, 5)],
      enemies: [weak],
    });

    expect(C04.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: weak.id } },
    ]);
  });

  it('здорового не преследует', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 5, 5)],
      enemies: [foe('swordsman', 6, 5)],
    });

    expect(C04.evaluate(ctx)).toEqual([]);
  });
});

describe('C05: проверка фланга', () => {
  const halfKnown = Array.from({ length: 12 }, () => '........????');

  it('без врагов проверяет ближнюю границу', () => {
    const { ctx } = scene({
      map: halfKnown,
      units: [own('rider', 3, 5)],
      buildings: [ownBuilding('base', 2, 2)],
    });

    expect(C05.evaluate(ctx)).toMatchObject([{ ruleId: 'C05' }]);
  });

  it('при видимом враге разведкой не занимается', () => {
    const { ctx } = scene({
      map: halfKnown,
      units: [own('rider', 3, 5)],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [foe('swordsman', 6, 10)],
    });

    expect(C05.evaluate(ctx)).toEqual([]);
  });
});

describe('C06: разрыв контакта', () => {
  it('рядом копейщик — уходит из его досягаемости', () => {
    const spear = foe('spearman', 6, 5);
    const rider = own('rider', 5, 5);
    const { ctx } = scene({ map, units: [rider], enemies: [spear] });

    const [candidate] = C06.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), spear)).toBeGreaterThan(
      manhattan(rider, spear),
    );
  });

  it('обычный мечник рядом — контакт не рвёт', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 5, 5)],
      enemies: [foe('swordsman', 6, 5)],
    });

    expect(C06.evaluate(ctx)).toEqual([]);
  });
});

describe('C05: с группой', () => {
  it('в наступлении всадник идёт на цель операции', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 1, 5), own('swordsman', 7, 5)],
      memory: {
        operation: {
          phase: 'advance',
          target: { x: 15, y: 5 },
          rally: null,
          since: 1,
        },
      },
    });

    expect(C05.evaluate(ctx)).toMatchObject([{ reason: 'наступаю на цель' }]);
  });
});
