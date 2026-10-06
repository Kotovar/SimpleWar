import { describe, expect, it } from 'vite-plus/test';
import { fogDensity } from './renderFogLayer';

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
