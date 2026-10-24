import { beforeEach, expect, it } from 'vite-plus/test';
import { useUnitsStore } from '@entities/units';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { initPopulationSystem } from '@app/system';
import { initVisibilitySystem } from '@features/visibility';
import { resetGame } from '@features/game-loop';
import { move } from '@features/pathfinding';
import { initializeStandardGame } from '@widgets/start-game';
import { applySnapshot, captureSnapshot } from './snapshot';

let scout: string;
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
});

it('сохраняет маскировку, затем движение и запрет скрыться на ближайшем ходу', () => {
  const concealed = captureSnapshot();
  expect(concealed.units[scout].concealed).toBe(true);
  resetGame();
  applySnapshot(concealed);
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
  expect(move({ actor: 'p1', unitId: scout, x: 1, y: 2 }).ok).toBe(true);
  const moved = captureSnapshot();
  expect(moved.units[scout].scoutActed).toBe(true);
  expect(moved.units[scout].concealed).toBeUndefined();
  resetGame();
  applySnapshot(moved);
  useUnitsStore.getState().resetUnitsForNewTurn('p1');
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
  useUnitsStore.getState().resetUnitsForNewTurn('p1');
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
});

it('старое сохранение без новых флагов загружается без немедленной маскировки', () => {
  const saved = captureSnapshot();
  delete saved.units[scout].concealed;
  delete saved.units[scout].scoutActed;
  applySnapshot(saved);
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
});

it.each([
  { concealed: false },
  { scoutActed: 'yes' },
  { concealed: true, scoutActed: true },
])('отклоняет повреждённые флаги разведчика %j до изменения мира', patch => {
  const saved = captureSnapshot();
  Object.assign(saved.units[scout], patch);
  const before = useUnitsStore.getState().units;
  expect(() => applySnapshot(saved)).toThrow();
  expect(useUnitsStore.getState().units).toBe(before);
});

it('не разрешает маскировку или её историю юнитам другого типа', () => {
  for (const patch of [{ concealed: true }, { scoutActed: true }]) {
    const saved = captureSnapshot();
    Object.assign(
      Object.values(saved.units).find(u => u.type === 'worker')!,
      patch,
    );
    expect(() => applySnapshot(saved)).toThrow();
  }
});
