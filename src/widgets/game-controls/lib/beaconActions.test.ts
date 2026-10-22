import { expect, it } from 'vite-plus/test';
import { getSelectionActions } from './selectionActions';
import { input, unit } from './actions.test-utils';

it('костёр доступен только разведчику; цена и причины отказа соответствуют запасам и действию', () => {
  const scout = unit('scout', { attackPoints: 1 });
  const button = (stock = { gold: 0, wood: 30 }) =>
    getSelectionActions(input({ unit: scout, stock })).find(
      b => b.id === 'lightBeacon',
    );
  expect(button()).toMatchObject({
    code: 'KeyB',
    cost: { gold: 0, wood: 30 },
    reason: undefined,
  });
  expect(button({ gold: 999, wood: 29 })?.reason).toBeDefined();
  if (scout.role !== 'military') throw new Error('Нужен боевой разведчик');
  scout.attackPoints = 0;
  expect(button()?.reason).toBe('Нет боевого действия');
  expect(
    getSelectionActions(input({ unit: unit('worker') })).some(
      b => b.id === 'lightBeacon',
    ),
  ).toBe(false);
  expect(
    getSelectionActions(input({ unit: scout, isTurn: false })).find(
      b => b.id === 'lightBeacon',
    )?.reason,
  ).toBe('Сейчас не ваш ход');
});
