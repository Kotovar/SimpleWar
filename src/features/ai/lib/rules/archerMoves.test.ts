import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import {
  cellOf,
  foe,
  grass,
  own,
  remembered,
  scene,
} from '../scene.test-utils';
import { A01, A04, A06 } from './archerMoves';

describe('A01/A04/A06: позиция лучника', () => {
  const map = grass(12, 12);

  it('A01 занимает огневую клетку в дальности цели', () => {
    const enemy = foe('worker', 9, 5);
    const { ctx } = scene({
      map,
      units: [own('archer', 3, 5)],
      enemies: [enemy],
    });

    const [candidate] = A01.evaluate(ctx);

    expect(candidate.ruleId).toBe('A01');
    expect(manhattan(cellOf(candidate.action), enemy)).toBeLessThanOrEqual(3);
  });

  it('A01 не двигается, когда цель уже в дальности', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 6, 5)],
      enemies: [foe('worker', 9, 5)],
    });

    expect(A01.evaluate(ctx)).toEqual([]);
  });

  it('A04 держится позади наступающей пехоты', () => {
    const target = { x: 10, y: 5 };
    const front = own('swordsman', 5, 5);
    const { ctx } = scene({
      map,
      units: [front, own('archer', 2, 5)],
      memory: {
        operation: { phase: 'advance', target, rally: null, since: 0 },
      },
    });

    const [candidate] = A04.evaluate(ctx);

    expect(candidate.ruleId).toBe('A04');
    expect(manhattan(cellOf(candidate.action), target)).toBeGreaterThan(
      manhattan(front, target),
    );
  });

  it('A04 молчит во время сбора', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 5, 5), own('archer', 2, 5)],
    });

    expect(A04.evaluate(ctx)).toEqual([]);
  });

  it('A06 идёт к последнему месту скрывшегося врага', () => {
    const contact = remembered('swordsman', 8, 5);
    const archer = own('archer', 3, 5);
    const { ctx } = scene({ map, units: [archer], contacts: [contact] });

    const [candidate] = A06.evaluate(ctx);

    expect(candidate.ruleId).toBe('A06');
    expect(manhattan(cellOf(candidate.action), contact)).toBeLessThan(
      manhattan(archer, contact),
    );
  });

  it('A06 не уходит за памятью, пока враг виден', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 3, 5)],
      contacts: [remembered('swordsman', 8, 5)],
      enemies: [foe('worker', 0, 11)],
    });

    expect(A06.evaluate(ctx)).toEqual([]);
  });
});
