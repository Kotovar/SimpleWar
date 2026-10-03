import { describe, expect, it } from 'vite-plus/test';
import { findSegmentedPath } from './findUnitRoute';

describe('findSegmentedPath', () => {
  it('сохраняет короткий транзит в обходе слишком длинного', () => {
    const costs = [Array(7).fill(1), Array(7).fill(1)];
    const landable = Uint8Array.from([
      1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1,
    ]);
    const route = findSegmentedPath(
      costs,
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      landable,
      4,
    );
    expect(route.cost).toBe(8);
    expect(route.path).toContainEqual({ x: 3, y: 1 });
    expect(route.path.at(-1)).toEqual({ x: 6, y: 0 });
  });

  it('учитывает цены рельефа и разрешает отрезок ровно по лимиту', () => {
    const args = [
      [[1, 2, 1]],
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      [1, 0, 1],
    ] as const;
    expect(
      findSegmentedPath(
        args[0].map(row => [...row]),
        args[1],
        args[2],
        args[3],
        3,
      ).cost,
    ).toBe(3);
    expect(
      findSegmentedPath(
        args[0].map(row => [...row]),
        args[1],
        args[2],
        args[3],
        2,
      ).cost,
    ).toBe(Infinity);
  });

  it('не возвращает путь без свободной конечной клетки', () => {
    expect(
      findSegmentedPath([[1, 1]], { x: 0, y: 0 }, { x: 1, y: 0 }, [1, 0], 4)
        .cost,
    ).toBe(Infinity);
  });

  it('отклоняет координаты за границами вместо перехода в соседнюю строку', () => {
    expect(
      findSegmentedPath(
        [
          [1, 1],
          [1, 1],
        ],
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        [1, 1, 1, 1],
        4,
      ).cost,
    ).toBe(Infinity);
  });
});
