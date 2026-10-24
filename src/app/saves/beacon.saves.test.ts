import { beforeEach, expect, it } from 'vite-plus/test';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { useSettingsStore } from '@entities/settings';
import { initPopulationSystem } from '@app/system';
import { initVisibilitySystem } from '@features/visibility';
import { nextTurn, resetGame } from '@features/game-loop';
import { lightBeacon } from '@features/build';
import { initializeStandardGame } from '@widgets/start-game';
import { applySnapshot, captureSnapshot } from './snapshot';

let id: string;
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
  const scout = useUnitsStore.getState().spawnUnit('scout', 2, 2, 'p1', true)!;
  useUnitsStore.getState().resetUnitsForNewTurn('p1');
  useEconomyStore.setState(s => {
    s.resources.p1.wood = 30;
  });
  expect(lightBeacon({ actor: 'p1', unitId: scout, x: 1, y: 2 })).toEqual({
    ok: true,
  });
  id = useBuildingsStore.getState().getBuildingAt(1, 2)!.id;
});
const round = () => {
  expect(nextTurn('p1').ok).toBe(true);
  expect(nextTurn('p2').ok).toBe(true);
};
it('загрузка сохраняет HP, обзор и оставшийся срок без нового отсчёта', () => {
  round();
  round();
  useBuildingsStore.getState().damageBuilding(id, 7);
  const snapshot = captureSnapshot();
  expect(snapshot.buildings[id]).toMatchObject({
    type: 'beacon',
    expiresTurn: 7,
    hp: 13,
    sightRange: 5,
  });
  resetGame();
  applySnapshot(snapshot);
  for (let i = 0; i < 3; i++) {
    round();
    expect(useBuildingsStore.getState().buildings[id]).toBeDefined();
  }
  round();
  expect(useBuildingsStore.getState().buildings[id]).toBeUndefined();
});
it.each([undefined, -1, 1.5, '7'])(
  'отклоняет повреждённый срок %s до изменения мира',
  expiresTurn => {
    const snapshot = captureSnapshot();
    Object.assign(snapshot.buildings[id], { expiresTurn });
    const buildings = useBuildingsStore.getState().buildings;
    expect(() => applySnapshot(snapshot)).toThrow();
    expect(useBuildingsStore.getState().buildings).toBe(buildings);
  },
);
