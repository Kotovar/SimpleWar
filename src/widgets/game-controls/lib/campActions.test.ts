import { expect, it } from 'vite-plus/test';
import type { CampSite } from '@shared/config';
import { getSelectionActions } from './selectionActions';
import { input } from './actions.test-utils';

const camp: CampSite = { id: 'camp', type: 'camp', x: 5, y: 5, hiresLeft: 3 };
const setup = () =>
  input({
    camp,
    campVisible: true,
    campHasScout: true,
    payableSpawn: { gold: 286, wood: 0 },
  });
it('панель лагеря показывает мечника и лучника с ценами и клавишами 1–2', () => {
  expect(
    getSelectionActions(setup()).map(b => ({
      id: b.id,
      code: b.code,
      cost: b.cost,
      reason: b.reason,
    })),
  ).toEqual([
    {
      id: 'spawn:swordsman',
      code: 'Digit1',
      cost: { gold: 234, wood: 0, population: 2 },
      reason: undefined,
    },
    {
      id: 'spawn:archer',
      code: 'Digit2',
      cost: { gold: 286, wood: 0, population: 2 },
      reason: undefined,
    },
  ]);
});
it('объясняет отсутствие своего разведчика, пустой лагерь и скрытый запас', () => {
  const own = setup();
  expect(
    getSelectionActions({ ...own, campHasScout: false }).every(
      b => b.reason === 'Нужен свой разведчик рядом с лагерем',
    ),
  ).toBe(true);
  expect(
    getSelectionActions({ ...own, camp: { ...camp, hiresLeft: 0 } }).every(
      b => b.reason === 'В лагере больше нет наёмников',
    ),
  ).toBe(true);
  expect(
    getSelectionActions({ ...own, campVisible: false }).every(
      b => b.reason === 'Клетка вне обзора',
    ),
  ).toBe(true);
});
it('учитывает цену, население и очередь хода без отключения панели', () => {
  const own = setup();
  const poor = getSelectionActions({
    ...own,
    payableSpawn: { gold: 234, wood: 0 },
  });
  expect(poor[0].reason).toBeUndefined();
  expect(poor[1].reason).toBe('Недостаточно ресурсов');
  expect(
    getSelectionActions({ ...own, population: { occupied: 9, max: 10 } }).every(
      b => b.reason === 'Не хватает лимита населения',
    ),
  ).toBe(true);
  expect(
    getSelectionActions({ ...own, isTurn: false }).every(
      b => b.reason === 'Сейчас не ваш ход',
    ),
  ).toBe(true);
});
