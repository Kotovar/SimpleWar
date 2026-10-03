import { describe, expect, it } from 'vite-plus/test';
import type { Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import { getPendingUnits } from './pendingUnits';

const unit = (type: Unit['type'], owner: 'p1' | 'p2', patch = {}) =>
  ({ ...createUnit(type, 0, 0, owner, false)!, ...patch }) as Unit;

describe('getPendingUnits', () => {
  it('не напоминает об исполнителе приказа, а об остановленном — всегда', () => {
    const order = { type: 'goto', x: 5, y: 0 } as const;
    const walking = unit('archer', 'p1', { movePoints: 3, order });
    const stopped = unit('archer', 'p1', {
      movePoints: 0,
      attackPoints: 0,
      order: { ...order, stopped: 'path' },
    });
    expect(
      getPendingUnits(
        [walking, stopped],
        'p1',
        () => false,
        () => false,
      ).map(u => u.id),
    ).toEqual([stopped.id]);
  });

  it.each(['skip', 'sleep'] as const)(
    'не напоминает о режиме %s даже с целью атаки',
    restMode => {
      const ready = unit('archer', 'p1', {
        movePoints: 3,
        attackPoints: 1,
        restMode,
      });
      expect(
        getPendingUnits(
          [ready],
          'p1',
          () => true,
          () => true,
        ),
      ).toEqual([]);
    },
  );
  it('свои с шагами, без рабочих внутри зданий и чужих', () => {
    const fresh = unit('archer', 'p1', { movePoints: 2 });
    const working = unit('worker', 'p1', { movePoints: 3, workplaceId: 'm' });
    const enemy = unit('archer', 'p2', { movePoints: 2 });

    expect(
      getPendingUnits(
        [fresh, working, enemy],
        'p1',
        () => true,
        () => false,
      ).map(u => u.id),
    ).toEqual([fresh.id]);
  });

  it('очки есть, но шагнуть некуда — юнит не учитывается', () => {
    const stuck = unit('scout', 'p1', { movePoints: 1 });
    expect(
      getPendingUnits(
        [stuck],
        'p1',
        () => false,
        () => false,
      ),
    ).toEqual([]);
  });

  it('боец без шагов учитывается, только если есть удар и цель', () => {
    const ready = unit('archer', 'p1', { movePoints: 0, attackPoints: 1 });
    const struck = unit('archer', 'p1', { movePoints: 0, attackPoints: 0 });

    const noStep = () => false;
    expect(getPendingUnits([ready, struck], 'p1', noStep, () => true)).toEqual([
      ready,
    ]);
    expect(getPendingUnits([ready, struck], 'p1', noStep, () => false)).toEqual(
      [],
    );
  });
});
