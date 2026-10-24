import { beforeEach, expect, it } from 'vite-plus/test';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSitesStore } from '@entities/sites';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { useSettingsStore } from '@entities/settings';
import { initPopulationSystem } from '@app/system';
import { initVisibilitySystem } from '@features/visibility';
import { resetGame, nextTurn } from '@features/game-loop';
import { occupyRuins } from '@features/build';
import { initializeStandardGame } from '@widgets/start-game';
import { applySnapshot, captureSnapshot } from './snapshot';

let id: string, scout: string;
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
  scout = useUnitsStore.getState().spawnUnit('scout', 2, 2, 'p1', true)!;
  useUnitsStore.getState().resetUnitsForNewTurn('p1');
  useSitesStore
    .getState()
    .setSites([{ id: 'ruins', type: 'ruins', x: 1, y: 2 }]);
  expect(occupyRuins({ actor: 'p1', unitId: scout, x: 1, y: 2 })).toEqual({
    ok: true,
  });
  id = useBuildingsStore.getState().getBuildingAt(1, 2)!.id;
});
it('сохраняет владельца, HP, доход и снабжение; после загрузки разрушение возвращает руины', () => {
  useBuildingsStore.getState().damageBuilding(id, 19);
  const snapshot = captureSnapshot();
  resetGame();
  applySnapshot(snapshot);
  expect(useBuildingsStore.getState().buildings[id]).toMatchObject({
    type: 'outpost',
    hp: 101,
    owner: 'p1',
    income: { gold: 5 },
    populationSupply: 2,
  });
  expect(useEconomyStore.getState().populationCap.p1.max).toBe(12);
  const before = useEconomyStore.getState().resources.p1.gold;
  expect(nextTurn('p1').ok).toBe(true);
  expect(useEconomyStore.getState().resources.p1.gold).toBe(before + 8);
  useBuildingsStore.getState().damageBuilding(id, 101);
  expect(useSitesStore.getState().getSiteAt(1, 2)?.type).toBe('ruins');
  expect(useEconomyStore.getState().populationCap.p1.max).toBe(10);
});
it('сохраняет восстановленные руины и даёт занять их повторно после загрузки', () => {
  useBuildingsStore.getState().damageBuilding(id, 120);
  const snapshot = captureSnapshot();
  resetGame();
  applySnapshot(snapshot);
  expect(useBuildingsStore.getState().getBuildingAt(1, 2)).toBeNull();
  expect(useSitesStore.getState().getSiteAt(1, 2)?.type).toBe('ruins');
  expect(nextTurn('p1').ok).toBe(true);
  expect(nextTurn('p2').ok).toBe(true);
  expect(occupyRuins({ actor: 'p1', unitId: scout, x: 1, y: 2 }).ok).toBe(true);
  expect(useSitesStore.getState().getSiteAt(1, 2)).toBeNull();
});
it.each([
  { income: undefined },
  { populationSupply: -1 },
  { role: 'resource' },
  { expiresTurn: 7 },
])('отклоняет повреждённый аванпост %j до изменения мира', patch => {
  const snapshot = captureSnapshot();
  Object.assign(snapshot.buildings[id], patch);
  const before = useBuildingsStore.getState().buildings;
  expect(() => applySnapshot(snapshot)).toThrow();
  expect(useBuildingsStore.getState().buildings).toBe(before);
});
