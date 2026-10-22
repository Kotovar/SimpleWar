import { expect, it } from 'vite-plus/test';
import { getSelectionActions } from './selectionActions';
import { input, unit } from './actions.test-utils';

it('захват доступен военному юниту без ресурсов, требует действие и свой ход', () => {
  const soldier = unit('swordsman', { attackPoints: 1 });
  const button = (isTurn = true) =>
    getSelectionActions(
      input({ unit: soldier, isTurn, stock: { gold: 0, wood: 0 } }),
    ).find(b => b.id === 'occupyRuins');
  expect(button()).toMatchObject({ code: 'KeyO', reason: undefined });
  expect(button(false)?.reason).toBe('Сейчас не ваш ход');
  if (soldier.role !== 'military') throw new Error('Нужен военный юнит');
  soldier.attackPoints = 0;
  expect(button()?.reason).toBe('Нет боевого действия');
  expect(
    getSelectionActions(input({ unit: unit('worker') })).some(
      b => b.id === 'occupyRuins',
    ),
  ).toBe(false);
});
