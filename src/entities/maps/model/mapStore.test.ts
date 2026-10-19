import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { useMapStore } from './mapStore';

const cell = (x: number, y: number): Cell => ({
  x,
  y,
  type: 'grass',
  isWalkable: true,
});

describe('useMapStore', () => {
  beforeEach(() => useMapStore.getState().resetStore());

  it('возвращает клетки по координатам и null за границами карты', () => {
    useMapStore.getState().setGrid([[cell(0, 0), cell(1, 0)]]);

    expect(useMapStore.getState().getCell(1, 0)).toEqual(cell(1, 0));
    expect(useMapStore.getState().getCell(-1, 0)).toBeNull();
    expect(useMapStore.getState().getCell(0, 1)).toBeNull();
  });

  it('обновляет только переданные поля клетки и игнорирует координаты вне карты', () => {
    useMapStore.getState().setGrid([[cell(0, 0), cell(1, 0)]]);

    useMapStore.getState().setCell(0, 0, {
      type: 'water',
      isWalkable: false,
    });
    useMapStore.getState().setCell(2, 0, { type: 'gold' });

    expect(useMapStore.getState().grid).toEqual([
      [{ ...cell(0, 0), type: 'water', isWalkable: false }, cell(1, 0)],
    ]);
  });
});
