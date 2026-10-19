import { describe, expect, it } from 'vite-plus/test';
import { decideStep } from '../decide';
import {
  foe,
  grass,
  own,
  ownBuilding,
  remembered,
  scene,
} from '../scene.test-utils';
import { T01, T02, T03, T04, T05 } from './towers';

const map = grass(12, 12);

describe('T01–T05: башни', () => {
  const tower = () => ownBuilding('tower', 5, 5);
  const base = () => ownBuilding('base', 2, 5);

  it('T01 бьёт врага, угрожающего ратуше', () => {
    const enemy = foe('swordsman', 4, 4);
    const { ctx } = scene({
      map,
      buildings: [base(), tower()],
      enemies: [enemy],
    });

    expect(T01.evaluate(ctx)).toMatchObject([
      { ruleId: 'T01', action: { type: 'attack', targetId: enemy.id } },
    ]);
  });

  it('T01 не стреляет по далёкому от ратуши врагу', () => {
    const { ctx } = scene({
      map,
      buildings: [base(), tower()],
      enemies: [foe('swordsman', 8, 5)],
    });

    expect(T01.evaluate(ctx)).toEqual([]);
  });

  it('T02 добивает опасную цель', () => {
    const enemy = foe('archer', 7, 5, { hp: 15 });
    const { ctx } = scene({ map, buildings: [tower()], enemies: [enemy] });

    expect(T02.evaluate(ctx)).toMatchObject([
      { ruleId: 'T02', action: { targetId: enemy.id } },
    ]);
  });

  it('T02 не считает добиваемой здоровую цель', () => {
    const { ctx } = scene({
      map,
      buildings: [tower()],
      enemies: [foe('archer', 7, 5)],
    });

    expect(T02.evaluate(ctx)).toEqual([]);
  });

  it('T03 бьёт врага, достающего до своего здания', () => {
    const enemy = foe('swordsman', 7, 6);
    const { ctx } = scene({
      map,
      buildings: [tower(), ownBuilding('farm', 7, 5)],
      enemies: [enemy],
    });

    expect(T03.evaluate(ctx)).toMatchObject([
      { ruleId: 'T03', action: { targetId: enemy.id } },
    ]);
  });

  it('T03 не считает угрозой врага вне досягаемости зданий', () => {
    const { ctx } = scene({
      map,
      buildings: [tower(), ownBuilding('farm', 7, 5)],
      enemies: [foe('swordsman', 5, 8)],
    });

    expect(T03.evaluate(ctx)).toEqual([]);
  });

  it('T04 прикрывает атакованного рабочего', () => {
    const enemy = foe('swordsman', 5, 8);
    const { ctx } = scene({
      map,
      units: [own('worker', 5, 7)],
      buildings: [tower()],
      enemies: [enemy],
    });

    expect(T04.evaluate(ctx)).toMatchObject([
      { ruleId: 'T04', action: { targetId: enemy.id } },
    ]);
  });

  it('T04 молчит, если рядом с врагом нет своих', () => {
    const { ctx } = scene({
      map,
      buildings: [tower()],
      enemies: [foe('swordsman', 5, 8)],
    });

    expect(T04.evaluate(ctx)).toEqual([]);
  });

  it('T05: по контакту из памяти башня не стреляет, а ждёт', () => {
    const { ctx } = scene({
      map,
      units: [own('worker', 5, 7)],
      buildings: [base(), tower(), ownBuilding('farm', 7, 5)],
      contacts: [remembered('swordsman', 6, 5)],
    });
    const towerRules = [T01, T02, T03, T04, T05];

    expect(T05.evaluate(ctx)).toMatchObject([
      { ruleId: 'T05', action: { type: 'wait' }, score: 0 },
    ]);
    expect(
      towerRules.flatMap(rule => rule.evaluate(ctx)).map(c => c.ruleId),
    ).toEqual(['T05']);
    expect(decideStep(ctx, towerRules).chosen).toBeNull();
  });

  it('T05 не ждёт, когда есть видимая цель', () => {
    const { ctx } = scene({
      map,
      buildings: [tower()],
      enemies: [foe('swordsman', 6, 5)],
    });

    expect(T05.evaluate(ctx)).toEqual([]);
  });
});
