import { expect, it } from 'vite-plus/test';
import type { Cell, Site } from '@shared/config';
import { observe, type ObservationInput } from './observe';

const grid: Cell[][] = [
  Array.from({ length: 5 }, (_, x) => ({
    x,
    y: 0,
    type: 'grass',
    isWalkable: true,
  })),
];
const cache: Site = {
  id: 'cache',
  type: 'cache',
  x: 1,
  y: 0,
  resource: 'gold',
  amount: 80,
};
const camp: Site = { id: 'camp', type: 'camp', x: 3, y: 0, hiresLeft: 3 };
const input = (
  xs: number[],
  sites: Site[] = [cache, camp],
): ObservationInput => ({
  grid,
  visible: Uint8Array.from({ length: 5 }, (_, x) => Number(xs.includes(x))),
  sites,
  enemies: [],
  turn: 1,
  eliminated: [],
});

it('запоминает только увиденные находки и не раскрывает награду тайника', () => {
  const known = observe(undefined, input([1]));
  expect(known.sites).toEqual({
    cache: { id: 'cache', type: 'cache', x: 1, y: 0 },
  });
});

it('скрытое исчезновение и изменение запаса не меняют память даже через много кругов', () => {
  const before = observe(undefined, input([1, 3]));
  const next = observe(before, {
    ...input([], [{ ...camp, hiresLeft: 0 }]),
    turn: 100,
  });
  expect(next.sites).toBe(before.sites);
  expect(next.sites.camp).toMatchObject({ hiresLeft: 3 });
  expect(next.sites).toHaveProperty('cache');
});

it('новый обзор опровергает исчезнувшую находку и обновляет запас лагеря', () => {
  const before = observe(undefined, input([1, 3]));
  const next = observe(before, input([1, 3], [{ ...camp, hiresLeft: 1 }]));
  expect(next.sites).toEqual({ camp: { ...camp, hiresLeft: 1 } });
  expect(before.sites).toHaveProperty('cache');
  expect(before.sites.camp).toMatchObject({ hiresLeft: 3 });
});

it('не создаёт новую память находок, если наблюдение не изменилось', () => {
  const before = observe(undefined, input([1, 3]));
  expect(observe(before, input([1, 3])).sites).toBe(before.sites);
});
