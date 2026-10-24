import { expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { observe, getKnownCellType, isKnownRichGold } from './observe';

const grid: Cell[][] = [
  [
    { x: 0, y: 0, type: 'grass', isWalkable: true, road: true },
    { x: 1, y: 0, type: 'gold', isWalkable: false, rich: true },
    { x: 2, y: 0, type: 'gold', isWalkable: false },
  ],
];
const input = {
  grid,
  visible: new Uint8Array([1, 1, 1]),
  enemies: [],
  turn: 1,
  eliminated: [],
};

it('обычный обзор не раскрывает богатство, обзор разведчика раскрывает только богатое золото', () => {
  const ordinary = observe(undefined, input);
  expect(ordinary.terrain).toEqual(new Uint8Array([0x81, 7, 7]));
  const scout = observe(ordinary, {
    ...input,
    scoutVisible: new Uint8Array([1, 1, 1]),
  });
  expect(scout.terrain).toEqual(new Uint8Array([0x81, 0x47, 7]));
  expect(getKnownCellType(scout, 1, 0)).toBe('gold');
  expect(isKnownRichGold(scout, 1, 0)).toBe(true);
  expect(isKnownRichGold(scout, 2, 0)).toBe(false);
});

it('помнит обнаруженное богатство и под обычным обзором, и в тумане', () => {
  const known = observe(undefined, {
    ...input,
    scoutVisible: new Uint8Array([0, 1, 0]),
  });
  expect(observe(known, input).terrain).toBe(known.terrain);
  const hidden = observe(known, {
    ...input,
    visible: new Uint8Array(3),
    turn: 20,
  });
  expect(hidden.terrain).toBe(known.terrain);
  expect(isKnownRichGold(hidden, 1, 0)).toBe(true);
  expect(isKnownRichGold(undefined, 1, 0)).toBe(false);
});

it('одна маска разведчика не открывает клетку вне общего обзора', () => {
  const hidden = observe(undefined, {
    ...input,
    visible: new Uint8Array(3),
    scoutVisible: new Uint8Array([1, 1, 1]),
  });
  expect(hidden.terrain).toEqual(new Uint8Array(3));
});
