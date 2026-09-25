import { afterEach, expect, it, vi } from 'vite-plus/test';
import { generateMap } from './generateMap';

afterEach(() => vi.restoreAllMocks());

it.each([0, 1, 12354, 215412312])(
  'reproduces the whole map, including gold, with seed %s',
  seed => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const first = generateMap(15, 15, seed);
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(generateMap(15, 15, seed)).toEqual(first);
  },
);

it('rejects invalid dimensions before allocating a map', () => {
  expect(() => generateMap(0, 15, 1)).toThrow();
  expect(() => generateMap(15.5, 15, 1)).toThrow();
});

it('rejects a fractional seed', () => {
  expect(() => generateMap(15, 15, 0.42)).toThrow();
});
