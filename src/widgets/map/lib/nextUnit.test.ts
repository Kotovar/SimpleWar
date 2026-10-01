import { describe, expect, it } from 'vite-plus/test';
import type { Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import { getNextUnit, hasActions, isIdleWorker } from './nextUnit';

const unit = (type: Unit['type'], x: number, y: number, patch = {}) =>
  ({ ...createUnit(type, x, y, 'p1', false)!, ...patch }) as Unit;

describe('getNextUnit', () => {
  const a = unit('archer', 3, 0, { movePoints: 1 });
  const b = unit('swordsman', 0, 1, { movePoints: 1 });
  const spent = unit('spearman', 1, 0, { movePoints: 0, attackPoints: 0 });
  const units = [b, spent, a];

  it('обходит юнитов с действиями по клеткам и по кругу', () => {
    expect(getNextUnit(units, null, hasActions)?.id).toBe(a.id);
    expect(getNextUnit(units, a.id, hasActions)?.id).toBe(b.id);
    expect(getNextUnit(units, b.id, hasActions)?.id).toBe(a.id);
  });

  it('с выбранным неподходящим начинает с первого, пусто — null', () => {
    expect(getNextUnit(units, spent.id, hasActions)?.id).toBe(a.id);
    expect(getNextUnit([spent], null, hasActions)).toBeNull();
  });
});

describe('hasActions / isIdleWorker', () => {
  it('очко удара или стройки — тоже действие', () => {
    expect(
      hasActions(unit('archer', 0, 0, { movePoints: 0, attackPoints: 1 })),
    ).toBe(true);
    expect(
      hasActions(unit('worker', 0, 0, { movePoints: 0, buildPoints: 1 })),
    ).toBe(true);
    expect(
      hasActions(unit('worker', 0, 0, { movePoints: 0, buildPoints: 0 })),
    ).toBe(false);
  });

  it('свободный рабочий — без работы в здании', () => {
    expect(isIdleWorker(unit('worker', 0, 0))).toBe(true);
    expect(isIdleWorker(unit('worker', 0, 0, { workplaceId: 'mine' }))).toBe(
      false,
    );
    expect(isIdleWorker(unit('archer', 0, 0))).toBe(false);
  });
});
