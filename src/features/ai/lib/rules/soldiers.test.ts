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
import { M01, M02, M05, M06 } from './soldiers';

const map = grass(12, 12);

describe('M01: перехват у базы', () => {
  it('бьёт врага у ратуши, если он в дальности', () => {
    const enemy = foe('swordsman', 5, 2);
    const sword = own('swordsman', 6, 2);
    const { ctx } = scene({
      map,
      units: [sword],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [enemy],
    });

    expect(M01.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'M01',
        group: 'defense',
        action: { type: 'attack', attackerId: sword.id, targetId: enemy.id },
      },
    ]);
  });

  it('идёт на перехват издалека', () => {
    const enemy = foe('swordsman', 5, 2);
    const sword = own('swordsman', 10, 10);
    const { ctx } = scene({
      map,
      units: [sword],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [enemy],
    });

    const [candidate] = M01.evaluate(ctx);

    expect(candidate.action.type).toBe('move');
    expect(manhattan(cellOf(candidate.action), enemy)).toBeLessThan(
      manhattan(sword, enemy),
    );
  });

  it('не реагирует на далёкого врага', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 6, 2)],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [foe('swordsman', 10, 10)],
    });

    expect(M01.evaluate(ctx)).toEqual([]);
  });
});

describe('M02: сопровождение', () => {
  it('встаёт рядом с рабочим под угрозой', () => {
    const worker = own('worker', 5, 5);
    const { ctx } = scene({
      map,
      units: [worker, own('swordsman', 2, 5)],
      enemies: [foe('swordsman', 8, 5)],
    });

    const [candidate] = M02.evaluate(ctx);

    expect(candidate.ruleId).toBe('M02');
    expect(manhattan(cellOf(candidate.action), worker)).toBeLessThanOrEqual(1);
  });

  it('не двигается, если рабочему ничто не грозит', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 5, 5), own('swordsman', 2, 5)],
      enemies: [foe('swordsman', 11, 11)],
    });

    expect(M02.evaluate(ctx)).toEqual([]);
  });
});

describe('M05: фокус огня', () => {
  it('атакует цель в дальности', () => {
    const enemy = foe('archer', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('swordsman', 5, 5)],
      enemies: [enemy],
    });

    expect(M05.evaluate(ctx)).toMatchObject([
      { ruleId: 'M05', action: { type: 'attack', targetId: enemy.id } },
    ]);
  });

  it('не дублирует огонь по уже обречённой цели', () => {
    const enemy = foe('archer', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('swordsman', 5, 5)],
      enemies: [enemy],
    });
    ctx.turn.plannedDamage.set(enemy.id, enemy.hp);

    expect(M05.evaluate(ctx)).toEqual([]);
  });

  it('не атакует без очка атаки', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 5, 5, { attackPoints: 0 })],
      enemies: [foe('archer', 6, 5)],
    });

    expect(M05.evaluate(ctx)).toEqual([]);
  });
});

describe('M06: отход раненого', () => {
  it('раненый мечник уходит из-под удара', () => {
    const sword = own('swordsman', 5, 5, { hp: 30 });
    const { ctx } = scene({
      map,
      units: [sword],
      enemies: [foe('swordsman', 7, 5)],
    });

    const [candidate] = M06.evaluate(ctx);

    expect(candidate.ruleId).toBe('M06');
    expect(ctx.threatAt(cellOf(candidate.action))).toBeLessThan(
      ctx.threatAt(sword),
    );
  });

  it('здоровый мечник не отходит', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 5, 5)],
      enemies: [foe('swordsman', 7, 5)],
    });

    expect(M06.evaluate(ctx)).toEqual([]);
  });
});
