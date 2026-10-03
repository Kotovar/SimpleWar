import { describe, expect, it } from 'vite-plus/test';
import type { Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import { getNextUnit, hasActions, isIdleWorker } from './nextUnit';

const unit = (type: Unit['type'], x: number, y: number, patch = {}) =>
  ({ ...createUnit(type, x, y, 'p1', false)!, ...patch }) as Unit;

// Шаг — по одним очкам; клетки хода проверяет `canUnitStep` в pathfinding.
const byPoints = (unit: Unit) => unit.movePoints > 0;
const fits = (unit: Unit) => hasActions(unit, byPoints);

describe('getNextUnit', () => {
  const a = unit('archer', 3, 0, { movePoints: 1 });
  const b = unit('swordsman', 0, 1, { movePoints: 1 });
  const spent = unit('spearman', 1, 0, { movePoints: 0, attackPoints: 0 });
  const units = [b, spent, a];

  it('обходит юнитов с действиями по клеткам и по кругу', () => {
    expect(getNextUnit(units, null, fits)?.id).toBe(a.id);
    expect(getNextUnit(units, a.id, fits)?.id).toBe(b.id);
    expect(getNextUnit(units, b.id, fits)?.id).toBe(a.id);
  });

  it('с выбранным неподходящим начинает с первого, пусто — null', () => {
    expect(getNextUnit(units, spent.id, fits)?.id).toBe(a.id);
    expect(getNextUnit([spent], null, fits)).toBeNull();
  });
});

describe('hasActions / isIdleWorker', () => {
  it.each(['skip', 'sleep'] as const)(
    'исключает %s из Tab и свободных рабочих',
    restMode => {
      const worker = unit('worker', 0, 0, {
        restMode,
        movePoints: 4,
        buildPoints: 1,
      });
      expect(hasActions(worker, byPoints)).toBe(false);
      expect(isIdleWorker(worker)).toBe(false);
      expect(getNextUnit([worker], null, fits)).toBeNull();
    },
  );
  it('очко удара или стройки — тоже действие', () => {
    expect(fits(unit('archer', 0, 0, { movePoints: 0, attackPoints: 1 }))).toBe(
      true,
    );
    expect(fits(unit('worker', 0, 0, { movePoints: 0, buildPoints: 1 }))).toBe(
      true,
    );
    expect(fits(unit('worker', 0, 0, { movePoints: 0, buildPoints: 0 }))).toBe(
      false,
    );
  });

  it('очки хода есть, но шагнуть некуда — действий нет', () => {
    const stuck = unit('scout', 0, 0, { movePoints: 1, attackPoints: 0 });
    expect(hasActions(stuck, () => false)).toBe(false);
    expect(hasActions(stuck, byPoints)).toBe(true);
  });

  it('свободный рабочий — без работы в здании', () => {
    expect(isIdleWorker(unit('worker', 0, 0))).toBe(true);
    expect(isIdleWorker(unit('worker', 0, 0, { workplaceId: 'mine' }))).toBe(
      false,
    );
    expect(isIdleWorker(unit('archer', 0, 0))).toBe(false);
  });
});

describe('приказ «Идти в точку»', () => {
  const order = { type: 'goto', x: 5, y: 0 } as const;

  it('Tab пропускает исполнителя и выбирает остановленного', () => {
    expect(fits(unit('archer', 0, 0, { movePoints: 2, order }))).toBe(false);
    expect(
      fits(
        unit('archer', 0, 0, {
          movePoints: 0,
          attackPoints: 0,
          order: { ...order, stopped: 'enemy' },
        }),
      ),
    ).toBe(true);
  });

  it('рабочий в пути не свободен', () => {
    expect(isIdleWorker(unit('worker', 0, 0, { order }))).toBe(false);
  });
});
