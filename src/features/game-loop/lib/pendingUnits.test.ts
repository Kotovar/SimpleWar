import { describe, expect, it } from 'vite-plus/test';
import type { Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import { getPendingUnits } from './pendingUnits';

const unit = (type: Unit['type'], owner: 'p1' | 'p2', patch = {}) =>
  ({ ...createUnit(type, 0, 0, owner, false)!, ...patch }) as Unit;

describe('getPendingUnits', () => {
  it('свои с шагами, без рабочих внутри зданий и чужих', () => {
    const fresh = unit('archer', 'p1', { movePoints: 2 });
    const working = unit('worker', 'p1', { movePoints: 3, workplaceId: 'm' });
    const enemy = unit('archer', 'p2', { movePoints: 2 });

    expect(
      getPendingUnits([fresh, working, enemy], 'p1', () => false).map(
        u => u.id,
      ),
    ).toEqual([fresh.id]);
  });

  it('боец без шагов учитывается, только если есть удар и цель', () => {
    const ready = unit('archer', 'p1', { movePoints: 0, attackPoints: 1 });
    const struck = unit('archer', 'p1', { movePoints: 0, attackPoints: 0 });

    expect(getPendingUnits([ready, struck], 'p1', () => true)).toEqual([ready]);
    expect(getPendingUnits([ready, struck], 'p1', () => false)).toEqual([]);
  });
});
