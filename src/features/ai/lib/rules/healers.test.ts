import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import { cellOf, foe, grass, own, scene } from '../scene.test-utils';
import { H01, H02, H03, H04 } from './healers';

const map = grass(16, 16);

describe('H01: лечение', () => {
  it('лечит раненого под угрозой с наибольшей пользой', () => {
    const calm = own('swordsman', 5, 6, { hp: 80 });
    const pressed = own('swordsman', 6, 5, { hp: 90 });
    const { ctx } = scene({
      map,
      units: [own('healer', 5, 5), calm, pressed],
      // Достаёт только до (6,5): 3 хода + 3 дальности.
      enemies: [foe('archer', 12, 5)],
    });

    expect(H01.evaluate(ctx)).toMatchObject([
      { action: { type: 'heal', targetId: pressed.id } },
    ]);
  });

  it('полное HP не лечит', () => {
    const { ctx } = scene({
      map,
      units: [own('healer', 5, 5), own('swordsman', 6, 5)],
    });

    expect(H01.evaluate(ctx)).toEqual([]);
  });

  it('себя не лечит', () => {
    const { ctx } = scene({
      map,
      units: [own('healer', 5, 5, { hp: 10 })],
    });

    expect(H01.evaluate(ctx)).toEqual([]);
  });
});

describe('H02: подход к раненому', () => {
  it('идёт на клетку лечения', () => {
    const patient = own('swordsman', 10, 5, { hp: 50 });
    const healer = own('healer', 3, 5);
    const { ctx } = scene({ map, units: [healer, patient] });

    const [candidate] = H02.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), patient)).toBeLessThan(
      manhattan(healer, patient),
    );
  });

  it('клетки у раненого под ближним ударом — не идёт', () => {
    const { ctx } = scene({
      map,
      units: [own('healer', 3, 5), own('swordsman', 10, 5, { hp: 50 })],
      enemies: [foe('swordsman', 11, 5), foe('swordsman', 10, 7)],
    });

    expect(H02.evaluate(ctx)).toEqual([]);
  });
});

describe('H03: отход лекаря', () => {
  it('под ближней угрозой уходит вместо лечения', () => {
    const healer = own('healer', 5, 5);
    const { ctx } = scene({
      map,
      units: [healer, own('swordsman', 5, 6, { hp: 50 })],
      enemies: [foe('swordsman', 8, 5)],
    });

    expect(H01.evaluate(ctx)).toEqual([]);
    expect(H03.evaluate(ctx)).toMatchObject([{ action: { type: 'move' } }]);
  });

  it('в безопасности не уходит', () => {
    const { ctx } = scene({ map, units: [own('healer', 5, 5)] });

    expect(H03.evaluate(ctx)).toEqual([]);
  });
});

describe('H04: сопровождение', () => {
  const operation = {
    phase: 'advance' as const,
    target: { x: 15, y: 5 },
    rally: null,
    since: 1,
  };

  it('лечить некого — идёт за группой', () => {
    const { ctx } = scene({
      map,
      units: [own('healer', 1, 5), own('swordsman', 7, 5)],
      memory: { operation },
    });

    expect(H04.evaluate(ctx)).toMatchObject([{ ruleId: 'H04' }]);
  });

  it('есть раненый — сопровождение уступает лечению', () => {
    const { ctx } = scene({
      map,
      units: [own('healer', 1, 5), own('swordsman', 7, 5, { hp: 10 })],
      memory: { operation },
    });

    expect(H04.evaluate(ctx)).toEqual([]);
  });
});
