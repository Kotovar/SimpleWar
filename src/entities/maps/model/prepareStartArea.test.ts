import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { useMapStore } from './mapStore';
import { prepareStartArea } from './prepareStartArea';

const waterGrid = (width: number, height: number): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'water' as const,
      isWalkable: false,
    })),
  );

describe('prepareStartArea', () => {
  beforeEach(() => useMapStore.getState().resetStore());

  it('превращает квадрат 3 × 3 вокруг базы в проходимую траву', () => {
    useMapStore.getState().setGrid(waterGrid(5, 5));

    prepareStartArea(2, 2);

    const { getCell } = useMapStore.getState();
    expect(getCell(1, 1)).toMatchObject({ type: 'grass', isWalkable: true });
    expect(getCell(2, 2)).toMatchObject({ type: 'grass', isWalkable: true });
    expect(getCell(3, 3)).toMatchObject({ type: 'grass', isWalkable: true });
    expect(getCell(0, 0)).toMatchObject({ type: 'water', isWalkable: false });
  });

  it('работает у края карты, ограничиваясь существующими клетками', () => {
    useMapStore.getState().setGrid(waterGrid(2, 2));

    expect(() => prepareStartArea(0, 0)).not.toThrow();
    expect(useMapStore.getState().grid.flat()).toEqual(
      waterGrid(2, 2)
        .flat()
        .map(cell => ({ ...cell, type: 'grass', isWalkable: true })),
    );
  });
});
