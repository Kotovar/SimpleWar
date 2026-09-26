import { writeFileSync } from 'node:fs';
import { expect, it } from 'vite-plus/test';
import { generateMap } from '../src/entities/maps/model/generateMap';

it('measures terrain distribution for seeds 0–199 before start preparation', () => {
  const rows = [15, 24, 30, 40].flatMap(size =>
    Array.from({ length: 200 }, (_, seed) => {
      const grid = generateMap(size, size, seed);
      const cells = grid.flat();
      expect(cells).toHaveLength(size * size);
      const swamps = cells.filter(cell => cell.type === 'swamp');
      expect(swamps.length).toBeLessThanOrEqual(Math.floor(cells.length * 0.1));
      for (const { x, y, type } of cells) {
        expect(grid[size - 1 - y][size - 1 - x].type).toBe(type);
      }
      const nearWater = swamps.filter(({ x, y }) =>
        [-1, 0, 1].some(dy =>
          [-1, 0, 1].some(dx => grid[y + dy]?.[x + dx]?.type === 'water'),
        ),
      ).length;
      return {
        size,
        seed,
        swamp: (swamps.length / cells.length) * 100,
        hill:
          (cells.filter(cell => cell.type === 'hill').length / cells.length) *
          100,
        nearWater: swamps.length ? (nearWater / swamps.length) * 100 : null,
      };
    }),
  );
  writeFileSync(
    '/tmp/simplewar-terrain-distribution.json',
    JSON.stringify(rows, null, 2),
  );
  for (const size of [15, 24, 30, 40]) {
    const subset = rows.filter(row => row.size === size);
    const average =
      subset.reduce((sum, row) => sum + row.swamp, 0) / subset.length;
    expect(average).toBeGreaterThanOrEqual(4);
    expect(average).toBeLessThanOrEqual(6);
  }
});
