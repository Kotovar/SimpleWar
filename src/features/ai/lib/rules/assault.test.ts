import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import { cellOf, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { M03, M04 } from './assault';

const map = grass(12, 12);

describe('M03/M04: сбор и наступление', () => {
  const gather = {
    phase: 'gather' as const,
    rally: { x: 3, y: 3 },
    target: { x: 10, y: 10 },
    since: 0,
  };

  it('M03 ведёт мечника к месту сбора', () => {
    const sword = own('swordsman', 9, 9);
    const { ctx } = scene({
      map,
      units: [sword],
      buildings: [ownBuilding('base', 1, 1)],
      memory: { operation: gather },
    });

    const [candidate] = M03.evaluate(ctx);

    expect(candidate.ruleId).toBe('M03');
    expect(manhattan(cellOf(candidate.action), gather.rally)).toBeLessThan(
      manhattan(sword, gather.rally),
    );
  });

  it('M03 не двигает мечника, уже стоящего у места сбора', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 4, 3)],
      buildings: [ownBuilding('base', 1, 1)],
      memory: { operation: gather },
    });

    expect(M03.evaluate(ctx)).toEqual([]);
  });

  it('M04 наступает на цель', () => {
    const sword = own('swordsman', 2, 2);
    const { ctx } = scene({
      map,
      units: [sword],
      memory: { operation: { ...gather, phase: 'advance' } },
    });

    const [candidate] = M04.evaluate(ctx);

    expect(candidate.ruleId).toBe('M04');
    expect(manhattan(cellOf(candidate.action), gather.target)).toBeLessThan(
      manhattan(sword, gather.target),
    );
  });

  it('M04 не наступает во время сбора', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 2, 2)],
      memory: { operation: gather },
    });

    expect(M04.evaluate(ctx)).toEqual([]);
  });
});
