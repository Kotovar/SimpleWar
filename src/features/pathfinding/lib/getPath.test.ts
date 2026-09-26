import { describe, expect, it } from 'vite-plus/test';
import { getPath } from './getPath';

describe('getPath', () => {
  it('does not open a blocked destination', () => {
    expect(getPath({ x: 0, y: 0 }, { x: 1, y: 0 }, [[1, 0]])).toEqual({
      path: [],
      cost: Infinity,
    });
  });

  it('returns no path for coordinates outside the grid', () => {
    expect(getPath({ x: 0, y: 0 }, { x: 2, y: 0 }, [[1, 1]]).path).toEqual([]);
    expect(
      getPath({ x: 0, y: 0 }, { x: -1, y: 1 }, [
        [1, 1],
        [1, 1],
      ]).path,
    ).toEqual([]);
  });

  it('finds a detour from an occupied start without changing the input grid', () => {
    const grid = [
      [1, 1, 1],
      [0, 0, 1],
      [1, 1, 1],
    ];
    const snapshot = structuredClone(grid);
    const route = getPath({ x: 0, y: 1 }, { x: 2, y: 1 }, grid);
    expect(route.path).toHaveLength(5);
    expect(route.cost).toBe(4);
    expect(grid).toEqual(snapshot);
  });

  it('compares routes by the sum of entry costs, not by length', () => {
    // Через один холм: 2 + 1 = 3 дешевле обхода по полю из четырёх шагов.
    const hill = [
      [1, 2, 1],
      [1, 1, 1],
    ];
    expect(getPath({ x: 0, y: 0 }, { x: 2, y: 0 }, hill)).toMatchObject({
      cost: 3,
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    });

    // Через три болота 2 + 2 + 2 + 1 = 7 дороже обхода из шести шагов.
    const swamp = [
      [1, 2, 2, 2, 1],
      [1, 1, 1, 1, 1],
    ];
    const route = getPath({ x: 0, y: 0 }, { x: 4, y: 0 }, swamp);
    expect(route.cost).toBe(6);
    expect(route.path).toContainEqual({ x: 2, y: 1 });
  });
});
