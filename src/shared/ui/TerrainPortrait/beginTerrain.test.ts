import { describe, expect, it } from 'vite-plus/test';
import { variantFor } from './beginTerrain';
import { TERRAIN_VARIANTS } from './drawTerrain';
import { SWAMPS } from './drawRelief';

it('болото имеет поровну вариантов с одной и двумя лужами', () => {
  const single = SWAMPS.filter(pools => pools.length === 1);
  const double = SWAMPS.filter(pools => pools.length === 2);

  expect(single.length).toBeGreaterThan(0);
  expect(single.length).toBe(double.length);
  expect(single.length + double.length).toBe(SWAMPS.length);
});

describe('variantFor', () => {
  it.each(Object.entries(TERRAIN_VARIANTS))(
    '%s: выбор стабилен и использует все %i рисунков',
    (_type, count) => {
      const cells = Array.from(
        { length: 400 },
        (_, i) => [i % 20, i / 20] as const,
      );
      const first = cells.map(([x, y]) =>
        variantFor(x, Math.floor(y), 911, count),
      );
      const second = cells.map(([x, y]) =>
        variantFor(x, Math.floor(y), 911, count),
      );

      expect(second).toEqual(first);
      expect(new Set(first)).toEqual(
        new Set(Array.from({ length: count }, (_, i) => i)),
      );
    },
  );
});
