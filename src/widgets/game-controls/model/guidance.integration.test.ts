import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { type Cell, DEFAULT_PARTICIPANTS } from '@shared/config';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore, JOURNAL_LIMIT } from '@entities/journals';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { usePreferencesStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import { nextTurn, resetGame } from '@features/game-loop';
import { move, autoExplore } from '@features/pathfinding';
import { assignWorker } from '@features/workers';
import { initGuidanceSystem, useGuidanceStore } from './guidanceStore';

const guide = () => useGuidanceStore.getState();
const journal = () => useJournalStore.getState();
let unsubscribe: () => void;
beforeEach(() => {
  resetGame();
  usePreferencesStore.setState({
    hintsEnabled: true,
    tutorialEnabled: true,
    tutorialStarted: false,
  });
  useSandboxStore.setState({ enabled: false });
  const grid: Cell[][] = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  unsubscribe = initGuidanceSystem();
  useGameLoopStore.getState().startGame(DEFAULT_PARTICIPANTS);
});
afterEach(() => unsubscribe());

const record = (
  type: 'enemySpotted' | 'build' | 'researchDone' | 'attackObserved',
  actor: 'p1' | 'p2' | null = 'p1',
) =>
  journal().record({
    type,
    actor,
    turn: 1,
    visibleTo: ['p1'],
    details: { owner: 'p1', x: 2, y: 3 },
  });

describe('помощник по журналу', () => {
  it('показывает каждую подсказку один раз за партию, даже после закрытия', () => {
    expect(guide().hints).toEqual(['keys']);
    guide().dismissHint();
    record('build');
    guide().dismissHint();
    record('build');
    record('enemySpotted', null);
    record('researchDone');
    record('attackObserved', null);
    expect(guide().hints).toEqual(['enemy', 'research', 'threat']);
    journal().newGame();
    expect(guide().seen).toEqual([]);
    expect(guide().hints).toEqual([]);
    expect(guide().pending).toEqual([]);
  });

  it('не читает скрытые события и чужие команды; выключенные подсказки не мешают сводке', () => {
    journal().record({
      type: 'enemySpotted',
      actor: null,
      turn: 1,
      visibleTo: ['p2'],
      details: { x: 8, y: 8 },
    });
    record('build', 'p2');
    expect(guide().hints).toEqual(['keys']);
    expect(guide().completed).toEqual([]);
    expect(guide().pending).toEqual([]);
    usePreferencesStore.getState().setHintsEnabled(false);
    record('researchDone');
    expect(guide().hints).toEqual(['keys']);
    expect(guide().pending).toHaveLength(1);
  });

  it('автоматически включает обучение только в первой обычной партии; позволяет повторить', () => {
    expect(guide().tutorialActive).toBe(true);
    guide().skipTutorial();
    resetGame();
    useGameLoopStore.getState().startGame();
    expect(guide().tutorialActive).toBe(false);
    guide().restartTutorial();
    expect(guide().tutorialActive).toBe(true);
    usePreferencesStore.getState().setTutorialEnabled(false);
    record('build');
    expect(guide().completed).toEqual([]);
  });

  it('не расходует первый автозапуск в тесте баланса и партии без человека', () => {
    resetGame();
    usePreferencesStore.setState({ tutorialStarted: false });
    useSandboxStore.setState({ enabled: true });
    useGameLoopStore.getState().startGame();
    expect(guide().tutorialActive).toBe(false);
    expect(usePreferencesStore.getState().tutorialStarted).toBe(false);
    resetGame();
    useSandboxStore.setState({ enabled: false });
    useGameLoopStore.getState().startGame([
      { id: 'p1', controller: 'ai' },
      { id: 'p2', controller: 'ai' },
    ]);
    expect(guide().hints).toEqual([]);
    expect(usePreferencesStore.getState().tutorialStarted).toBe(false);
  });

  it('отмечает реальные движение, авторазведку, добычу и конец хода; пассивный доход не считается добычей', () => {
    const buildings = useBuildingsStore.getState();
    buildings.spawnBuilding('base', 1, 1, 'p1');
    const worker = useUnitsStore
      .getState()
      .spawnUnit('worker', 2, 1, 'p1', true)!;
    expect(move({ actor: 'p1', unitId: worker, x: 3, y: 1 }).ok).toBe(true);
    expect(guide().completed).toContain('controls');
    expect(nextTurn('p1').ok).toBe(true);
    expect(guide().completed).toContain('endTurn');
    expect(guide().completed).not.toContain('gold');
    expect(guide().completed).not.toContain('wood');
    nextTurn('p2');
    const mine = buildings.spawnBuilding('mine', 3, 2, 'p1')!;
    expect(
      assignWorker({ actor: 'p1', workerId: worker, buildingId: mine }).ok,
    ).toBe(true);
    const sawmill = buildings.spawnBuilding('sawmill', 4, 2, 'p1')!;
    const second = useUnitsStore
      .getState()
      .spawnUnit('worker', 4, 1, 'p1', true)!;
    expect(
      assignWorker({ actor: 'p1', workerId: second, buildingId: sawmill }).ok,
    ).toBe(true);
    expect(nextTurn('p1').ok).toBe(true);
    expect(guide().completed).toEqual(expect.arrayContaining(['gold', 'wood']));
    const income = journal().entries.findLast(
      entry => entry.type === 'income' && entry.actor === 'p1',
    );
    expect(income?.details).toMatchObject({
      gold: 18,
      wood: 17,
      minedGold: 1,
      minedWood: 1,
    });
    expect(useEconomyStore.getState().resources.p1.gold).toBeGreaterThan(0);
    nextTurn('p2');
    const scout = useUnitsStore
      .getState()
      .spawnUnit('scout', 5, 1, 'p1', true)!;
    expect(autoExplore({ actor: 'p1', unitId: scout }).ok).toBe(true);
    expect(guide().completed).toContain('scout');
  });

  it('сохраняет сводку через длинный ход и не повторяет её после закрытия', () => {
    journal().record({
      type: 'unitDestroyed',
      actor: 'p2',
      turn: 1,
      visibleTo: ['p1'],
      details: { owner: 'p1', unitType: 'worker', x: 3, y: 4 },
    });
    for (let index = 0; index <= JOURNAL_LIMIT; index++) {
      journal().record({
        type: 'move',
        actor: 'p2',
        turn: 1,
        visibleTo: ['p2'],
      });
    }
    expect(guide().summary).toEqual([]);
    nextTurn('p1');
    nextTurn('p2');
    expect(guide().summaryTurn).toBe(2);
    expect(guide().summary).toMatchObject([
      { position: { x: 3, y: 4 }, count: 1 },
    ]);
    const snapshot = guide().summary;
    useUnitsStore.getState().spawnUnit('archer', 3, 4, 'p2');
    expect(guide().summary).toBe(snapshot);
    guide().dismissSummary();
    journal().record({ type: 'move', actor: 'p1', turn: 2, visibleTo: ['p1'] });
    expect(guide().summary).toEqual([]);
    nextTurn('p1');
    nextTurn('p2');
    expect(guide().summary).toEqual([]);
  });
});
