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
import { K01, K02, K03, K04 } from './mages';

const map = grass(16, 16);

describe('K01: магическая атака', () => {
  it('выбирает цель по урону после сопротивления', () => {
    const worker = foe('worker', 7, 5);
    const { ctx } = scene({
      map,
      units: [own('mage', 5, 5)],
      enemies: [foe('healer', 5, 7), worker],
    });

    // Обе цели безоружны; лекарь держит магию (защита 4): урон 16 против 20.
    expect(K01.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: worker.id } },
    ]);
  });

  it('здание держит магию — не тратит удар', () => {
    const { ctx } = scene({
      map,
      units: [own('mage', 5, 5)],
      enemies: [foe('farm', 7, 5)],
    });

    expect(K01.evaluate(ctx)).toEqual([]);
  });
});

describe('K02: подход мага', () => {
  it('подходит под прикрытием на дальность', () => {
    const enemy = foe('swordsman', 12, 5);
    const mage = own('mage', 3, 5);
    const { ctx } = scene({
      map,
      // Мечник между магом и целью закрывает ей ближний удар.
      units: [mage, own('swordsman', 10, 5)],
      enemies: [enemy],
    });

    const [candidate] = K02.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), enemy)).toBeLessThan(
      manhattan(mage, enemy),
    );
  });

  it('без прикрытия не подходит', () => {
    const { ctx } = scene({
      map,
      units: [own('mage', 3, 5)],
      enemies: [foe('swordsman', 12, 5)],
    });

    expect(K02.evaluate(ctx)).toEqual([]);
  });
});

describe('K03: противовоздушная защита', () => {
  it('бьёт грифона у базы', () => {
    const griffon = foe('griffon', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('mage', 5, 7)],
      buildings: [ownBuilding('base', 3, 5)],
      enemies: [griffon],
    });

    expect(K03.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: griffon.id } },
    ]);
  });

  it('наземный враг у базы — не воздушная угроза', () => {
    const { ctx } = scene({
      map,
      units: [own('mage', 5, 7)],
      buildings: [ownBuilding('base', 3, 5)],
      enemies: [foe('swordsman', 6, 5)],
    });

    expect(K03.evaluate(ctx)).toEqual([]);
  });
});

describe('K04: отход мага', () => {
  it('ближний враг — отходит', () => {
    const mage = own('mage', 5, 5);
    const { ctx } = scene({
      map,
      units: [mage],
      enemies: [foe('swordsman', 9, 5)],
    });

    const [candidate] = K04.evaluate(ctx);

    expect(ctx.threatAt(cellOf(candidate.action))).toBeLessThan(
      ctx.threatAt(mage),
    );
  });

  it('далёкий стрелок — не повод отходить', () => {
    const { ctx } = scene({
      map,
      units: [own('mage', 5, 5)],
      enemies: [foe('archer', 12, 12)],
    });

    expect(K04.evaluate(ctx)).toEqual([]);
  });
});
