import { describe, expect, it } from 'vite-plus/test';
import { countRouteTurns } from './countRouteTurns';

const row = (count: number) =>
  Array.from({ length: count }, (_, x) => ({ x, y: 0 }));

describe('countRouteTurns', () => {
  it('counts the current turn when the points are enough', () => {
    expect(countRouteTurns(row(4), [[1, 1, 1, 1]], 3, 3)).toBe(1);
  });

  it('moves a step that does not fit the remaining points to the next turn', () => {
    // 1 + 2 = 3 очка в этот ход, болото за 2 не помещается в остаток 0.
    expect(countRouteTurns(row(4), [[1, 1, 2, 2]], 3, 3)).toBe(2);
    expect(countRouteTurns(row(7), [[1, 1, 1, 1, 1, 1, 1]], 1, 2)).toBe(4);
  });

  it('starts from the next turn when no points are left', () => {
    expect(countRouteTurns(row(2), [[1, 1]], 0, 3)).toBe(2);
  });

  it('treats unknown cells by the grid cost', () => {
    // Неизвестная клетка оценена ценой 1, как в приказе на ход.
    expect(countRouteTurns(row(3), [[1, 1, 1]], 2, 2)).toBe(1);
  });

  it('returns Infinity for a blocked or unaffordable step', () => {
    expect(countRouteTurns(row(2), [[1, 0]], 3, 3)).toBe(Infinity);
    expect(countRouteTurns(row(2), [[1, 3]], 3, 2)).toBe(Infinity);
  });

  it('counts transit through own units as one segment with the next free cell', () => {
    const own = ({ x }: { x: number }) => x !== 1 && x !== 2;
    // 0 → 3 через двух своих — один отрезок за 3 очка: с остатком 2 он
    // целиком переносится на ход 2, клетка 4 — уже на ход 3.
    expect(countRouteTurns(row(5), [[1, 1, 1, 1, 1]], 2, 3, own)).toBe(3);
    expect(countRouteTurns(row(5), [[1, 1, 1, 1, 1]], 3, 3, own)).toBe(2);
    expect(countRouteTurns(row(5), [[1, 1, 1, 1, 1]], 3, 2, own)).toBe(
      Infinity,
    );
  });
});
