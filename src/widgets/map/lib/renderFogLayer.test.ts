import { describe, expect, it } from 'vite-plus/test';
import { changedCells, fogDensity } from './renderFogLayer';

// Закрыто всё, кроме клетки (2, 2).
const covered = (x: number, y: number) => x !== 2 || y !== 2;

describe('fogDensity', () => {
  it('держит центр видимой клетки чистым, а закрытой — сплошным', () => {
    for (const salt of [1, 11, 23]) {
      expect(fogDensity(covered, 2.5, 2.5, salt)).toBe(0);
      expect(fogDensity(covered, 0.5, 0.5, salt)).toBe(1);
    }
  });

  it('скругляет угол видимой клетки', () => {
    // Угол клетки ближе к трём закрытым соседям, чем середина её стороны.
    expect(fogDensity(covered, 2.02, 2.02, 1)).toBeGreaterThan(
      fogDensity(covered, 2.5, 2.02, 1),
    );
  });
});

describe('changedCells', () => {
  const field = (cells: number[]) => {
    const values = new Uint8Array(12);
    for (const i of cells) values[i] = 1;
    return values;
  };
  const terrain = field([]);

  it('без изменений покрытия — null, даже если вырос счётчик обзора', () => {
    const before = { visible: field([5]), terrain };
    const after = { visible: field([5]), terrain };
    after.visible[5] = 2;
    expect(changedCells(4, before, after)).toBeNull();
  });

  it('собирает изменившиеся клетки обзора и разведки в общую рамку', () => {
    const before = { visible: field([0]), terrain };
    const after = { visible: field([]), terrain: field([10]) };
    // Карта 4 × 3: клетка 0 — (0, 0), клетка 10 — (2, 2).
    expect(changedCells(4, before, after)).toEqual({
      x0: 0,
      y0: 0,
      x1: 3,
      y1: 3,
    });
  });
});
