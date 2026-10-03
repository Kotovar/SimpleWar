import { beforeEach, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { useKnowledgeStore } from '@entities/perceptions';
import { useResearchStore } from '@entities/researches';
import { useJournalStore } from '@entities/journals';
import { useAiMemoryStore } from '@entities/ai-memories';
import { initGameLoopEvents, resetGame } from '@features/game-loop';
import { initVisibilitySystem, getObservation } from '@features/visibility';
import { runAITurn } from './aiTurn';

beforeEach(() => {
  resetGame();
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});

it('ИИ против ИИ: десять кругов без повторного удара по разрушенному зданию вне обзора', async () => {
  const grid: Cell[][] = Array.from({ length: 9 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  // Орудие за скалами: цель в дальности, разведывательного обзора нет.
  for (const [x, y] of [
    [1, 2],
    [3, 2],
    [2, 1],
    [2, 3],
  ])
    grid[y][x] = { x, y, type: 'mountain', isWalkable: false };
  for (const x of [6, 10])
    grid[2][x] = { x, y: 2, type: 'gold', isWalkable: false };
  useMapStore.setState({ grid, seed: 3 });
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS.map(p => ({ ...p, controller: 'ai' })),
    eliminated: [],
    winner: null,
  });
  const buildings = useBuildingsStore.getState();
  buildings.spawnBuilding('base', 0, 0, 'p1');
  buildings.spawnBuilding('base', 13, 7, 'p2');
  const mineId = buildings.spawnBuilding('mine', 6, 2, 'p2')!;
  useBuildingsStore.setState(state => ({
    buildings: {
      ...state.buildings,
      [mineId]: { ...state.buildings[mineId], hp: 1 },
    },
  }));
  const siegeId = useUnitsStore.getState().spawnUnit('siege', 2, 2, 'p1')!;
  useUnitsStore.getState().spawnUnit('worker', 7, 2, 'p2');
  for (const owner of ['p1', 'p2'] as const)
    useUnitsStore.getState().resetUnitsForNewTurn(owner);
  useEconomyStore.setState(state => ({
    resources: {
      ...state.resources,
      p1: { gold: 0, wood: 0 },
      p2: { gold: 500, wood: 300 },
    },
  }));
  useResearchStore.setState({
    completed: { p1: ['hiddenAiming'] },
    current: {},
  });
  const mine = useBuildingsStore.getState().buildings[mineId];
  useKnowledgeStore.setState(state => ({
    byParticipant: {
      ...state.byParticipant,
      p1: {
        width: 15,
        height: 9,
        visible: state.byParticipant.p1!.visible,
        terrain: Uint8Array.from(grid.flat(), cell =>
          cell.type === 'mountain' ? 4 : cell.type === 'gold' ? 7 : 1,
        ),
        contacts: {
          [mineId]: {
            id: mineId,
            kind: 'building',
            type: 'mine',
            owner: 'p2',
            x: 6,
            y: 2,
            hp: 1,
            maxHp: mine.maxHp,
            seenTurn: 1,
          },
        },
        strikes: {},
      },
    },
  }));

  for (let round = 0; round < 10; round++) {
    for (const actor of ['p1', 'p2'] as const) {
      expect(useGameLoopStore.getState().activePlayer).toBe(actor);
      const result = await runAITurn(actor, {
        yieldControl: () => Promise.resolve(),
      });
      expect(result).toMatchObject({ cancelled: false, stalled: false });
    }
  }
  expect(useGameLoopStore.getState().currentTurn).toBe(11);
  expect(useBuildingsStore.getState().buildings[mineId]).toBeUndefined();
  expect(getObservation('p1').visible[2][6]).toBe(false);
  expect(getObservation('p1').contacts.some(c => c.id === mineId)).toBe(true);
  expect(
    useJournalStore
      .getState()
      .entries.filter(
        r =>
          r.type === 'strike' &&
          r.actor === 'p1' &&
          r.details?.x === 6 &&
          r.details?.y === 2,
      ),
  ).toHaveLength(1);
  expect(
    useAiMemoryStore.getState().byParticipant.p1?.blindStrikes['6,2'],
  ).toEqual({ x: 6, y: 2 });
  expect(useUnitsStore.getState().units[siegeId]).toBeDefined();
});
