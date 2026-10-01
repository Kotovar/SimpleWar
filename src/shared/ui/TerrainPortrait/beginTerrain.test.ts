import { describe, expect, it } from 'vite-plus/test';
import { variantFor } from './beginTerrain';

describe('variantFor', () => {
  it('вариант клетки стабилен между вызовами и лежит в диапазоне', () => {
    const cells = Array.from(
      { length: 400 },
      (_, i) => [i % 20, i / 20] as const,
    );
    const first = cells.map(([x, y]) => variantFor(x, Math.floor(y), 911, 4));
    const second = cells.map(([x, y]) => variantFor(x, Math.floor(y), 911, 4));

    expect(second).toEqual(first);
    expect(new Set(first)).toEqual(new Set([0, 1, 2, 3]));
  });
});
