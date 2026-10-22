import { beforeEach, expect, it } from 'vite-plus/test';
import { useUnitsStore } from '@entities/units';
import { useSitesStore } from '@entities/sites';
import { useJournalStore } from '@entities/journals';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { useSettingsStore } from '@entities/settings';
import { initPopulationSystem } from '@app/system';
import { initVisibilitySystem } from '@features/visibility';
import { resetGame } from '@features/game-loop';
import { spawn } from '@features/spawn';
import { initializeStandardGame } from '@widgets/start-game';
import { applySnapshot, captureSnapshot } from './snapshot';

beforeEach(() => {
  initPopulationSystem();
  initVisibilitySystem();
  resetGame();
  useSettingsStore.setState({
    gridColumns: 30,
    gridRows: 30,
    mapGenerationMode: 'fixed',
    customSeed: 43,
  });
  useGameLoopStore.getState().startGame(initializeStandardGame()!);
  useSitesStore
    .getState()
    .setSites([{ id: 'camp', type: 'camp', x: 2, y: 2, hiresLeft: 3 }]);
  useUnitsStore.getState().spawnUnit('scout', 2, 3, 'p1', true);
  useEconomyStore.setState(s => {
    s.resources.p1 = { gold: 1000, wood: 0 };
  });
});
it('сохраняет оставшийся запас, цену, население и журнал найма; загрузка не обновляет лагерь', () => {
  expect(
    spawn({ actor: 'p1', campId: 'camp', unitType: 'archer', x: 1, y: 2 }),
  ).toEqual({ ok: true });
  const snapshot = captureSnapshot();
  resetGame();
  applySnapshot(snapshot);
  expect(useSitesStore.getState().sites.camp).toMatchObject({ hiresLeft: 2 });
  expect(
    useJournalStore
      .getState()
      .entries.some(e => e.type === 'spawn' && e.details?.campId === 'camp'),
  ).toBe(true);
  expect(useEconomyStore.getState().resources.p1).toEqual({
    gold: 714,
    wood: 0,
  });
  expect(useEconomyStore.getState().populationCap.p1.occupied).toBe(4);
  expect(useUnitsStore.getState().getUnitAt(1, 2)).toMatchObject({
    type: 'archer',
    movePoints: 0,
    attackPoints: 0,
  });
  expect(
    spawn({ actor: 'p1', campId: 'camp', unitType: 'swordsman', x: 3, y: 2 }),
  ).toEqual({ ok: true });
  expect(useSitesStore.getState().sites.camp).toMatchObject({ hiresLeft: 1 });
});
it('пустой лагерь остаётся пустым после загрузки', () => {
  for (const [x, y] of [
    [1, 2],
    [3, 2],
    [3, 3],
  ])
    expect(
      spawn({ actor: 'p1', campId: 'camp', unitType: 'swordsman', x, y }).ok,
    ).toBe(true);
  const snapshot = captureSnapshot();
  resetGame();
  applySnapshot(snapshot);
  expect(useSitesStore.getState().sites.camp).toMatchObject({ hiresLeft: 0 });
  expect(
    spawn({ actor: 'p1', campId: 'camp', unitType: 'swordsman', x: 1, y: 3 }),
  ).toMatchObject({ ok: false, code: 'campEmpty' });
});
it.each([-1, 4, 1.5])(
  'отклоняет повреждённый запас %s до изменения мира',
  hiresLeft => {
    const snapshot = captureSnapshot();
    Object.assign(snapshot.sites.camp, { hiresLeft });
    const before = useSitesStore.getState().sites;
    expect(() => applySnapshot(snapshot)).toThrow();
    expect(useSitesStore.getState().sites).toBe(before);
  },
);
