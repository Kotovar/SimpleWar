import { beforeEach, expect, it } from 'vite-plus/test';
import { useSitesStore } from './sitesStore';

beforeEach(() => useSitesStore.getState().resetStore());

it('заменяет находки, находит по клетке и очищает их при сбросе', () => {
  const store = () => useSitesStore.getState();
  const cache = {
    id: 'cache',
    type: 'cache',
    x: 8,
    y: 9,
    resource: 'gold',
    amount: 80,
  } as const;
  store().setSites([cache]);
  expect(store().getSiteAt(8, 9)).toEqual(cache);
  expect(store().getSiteAt(9, 8)).toBeNull();
  store().setSites([{ id: 'ruins', type: 'ruins', x: 10, y: 10 }]);
  expect(store().getSiteAt(8, 9)).toBeNull();
  expect(Object.keys(store().sites)).toEqual(['ruins']);
  store().resetStore();
  expect(store().sites).toEqual({});
});
