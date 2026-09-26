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
import { A02, A03, A05, A07 } from './archers';

describe('A02/A03/A05/A07: огонь и отход лучника', () => {
  const map = grass(12, 12);

  it('A02 добивает опасную цель', () => {
    const enemy = foe('swordsman', 7, 5, { hp: 20 });
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5)],
      enemies: [enemy],
    });

    expect(A02.evaluate(ctx)).toMatchObject([
      { ruleId: 'A02', action: { type: 'attack', targetId: enemy.id } },
    ]);
  });

  it('A02 не считает целью недобиваемого врага', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5)],
      enemies: [foe('swordsman', 7, 5)],
    });

    expect(A02.evaluate(ctx)).toEqual([]);
  });

  it('A03 выбирает вражеского стрелка, а не рабочего', () => {
    const archer = foe('archer', 7, 6);
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5)],
      enemies: [foe('worker', 6, 7), archer],
    });

    expect(A03.evaluate(ctx)).toMatchObject([
      { ruleId: 'A03', action: { targetId: archer.id } },
    ]);
  });

  it('A03 не стреляет без очка атаки', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5, { attackPoints: 0 })],
      enemies: [foe('archer', 7, 6)],
    });

    expect(A03.evaluate(ctx)).toEqual([]);
  });

  it('A05 ведёт оборонительный огонь по врагу у ратуши', () => {
    const enemy = foe('swordsman', 5, 2);
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 4)],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [enemy],
    });

    expect(A05.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'A05',
        group: 'defense',
        action: { type: 'attack', targetId: enemy.id },
      },
    ]);
  });

  it('A05 молчит, пока базе и рабочим ничто не грозит', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 4)],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [foe('swordsman', 11, 11)],
    });

    expect(A05.evaluate(ctx)).toEqual([]);
  });

  it('A07 уводит раненого лучника из-под удара', () => {
    const archer = own('archer', 5, 5, { hp: 15 });
    const { ctx } = scene({
      map,
      units: [archer],
      enemies: [foe('swordsman', 8, 5)],
    });

    const [candidate] = A07.evaluate(ctx);

    expect(candidate).toMatchObject({ ruleId: 'A07', group: 'defense' });
    expect(ctx.threatAt(cellOf(candidate.action))).toBeLessThan(
      ctx.threatAt(archer),
    );
  });

  it('A07 отступает на дальность выстрела, если уйти нельзя', () => {
    const enemy = foe('swordsman', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5)],
      enemies: [enemy],
    });

    const [candidate] = A07.evaluate(ctx);
    const cell = cellOf(candidate.action);

    expect(candidate).toMatchObject({ ruleId: 'A07', group: 'defense' });
    expect(manhattan(cell, enemy)).toBe(3);
  });

  it('A07 не отходит без угрозы', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5)],
      enemies: [foe('swordsman', 11, 11)],
    });

    expect(A07.evaluate(ctx)).toEqual([]);
  });

  it('после выстрела лучник не отходит: атака обнулила движение', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5, { attackPoints: 0, movePoints: 0 })],
      enemies: [foe('swordsman', 6, 5)],
    });

    expect(A07.evaluate(ctx)).toEqual([]);
  });
});
