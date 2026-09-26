import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { getAttackableTargets } from './getAttackableTargets';

beforeEach(() => {
  useUnitsStore.getState().resetStore();
  useBuildingsStore.getState().resetStore();
});

describe('getAttackableTargets', () => {
  it('returns enemy units and buildings within Manhattan range only', () => {
    const nearUnit = useUnitsStore.getState().spawnUnit('worker', 2, 1, 'p2');
    const diagonalUnit = useUnitsStore
      .getState()
      .spawnUnit('archer', 2, 2, 'p2');
    const distantUnit = useUnitsStore
      .getState()
      .spawnUnit('swordsman', 4, 1, 'p2');
    const alliedUnit = useUnitsStore.getState().spawnUnit('worker', 0, 1, 'p1');
    const nearBuilding = useBuildingsStore
      .getState()
      .spawnBuilding('base', 1, 2, 'p2');

    expect(nearUnit).not.toBeNull();
    expect(diagonalUnit).not.toBeNull();
    expect(distantUnit).not.toBeNull();
    expect(alliedUnit).not.toBeNull();
    expect(nearBuilding).not.toBeNull();

    const targets = getAttackableTargets({ x: 1, y: 1 }, 1, 'p1');

    expect(targets).toHaveLength(2);
    expect(targets).toEqual(
      expect.arrayContaining([
        {
          id: nearUnit,
          x: 2,
          y: 1,
          owner: 'p2',
          kind: 'unit',
        },
        {
          id: nearBuilding,
          x: 1,
          y: 2,
          owner: 'p2',
          kind: 'building',
        },
      ]),
    );
  });
});
