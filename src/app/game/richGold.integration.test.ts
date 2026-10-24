import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant } from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import {
  getParticipantKnowledge,
  isKnownRichGold,
} from '@entities/perceptions';
import { useSitesStore } from '@entities/sites';
import { nextTurn, resetGame } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { move } from '@features/pathfinding';
import { buildScene } from '@widgets/map';
import { initPopulationSystem } from '@app/system';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 1 },
  { id: 'p3', controller: 'ai', team: 2 },
];
let scout: string;
beforeEach(() => {
  initPopulationSystem();
  initVisibilitySystem();
  resetGame();
  const grid: Cell[][] = Array.from({ length: 30 }, (_, y) =>
    Array.from({ length: 30 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  grid[10][10] = { x: 10, y: 10, type: 'gold', isWalkable: false, rich: true };
  useMapStore.setState({ grid });
  useGameLoopStore.setState({
    participants,
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    eliminated: [],
  });
  const mine = useBuildingsStore
    .getState()
    .spawnBuilding('mine', 10, 10, 'p1')!;
  const worker = useUnitsStore
    .getState()
    .spawnUnit('worker', 10, 10, 'p1', true)!;
  useUnitsStore.getState().setWorkplace(worker, mine);
  scout = useUnitsStore.getState().spawnUnit('scout', 10, 2, 'p1', true)!;
});
afterEach(resetGame);

const known = (id: 'p1' | 'p2' | 'p3') => getParticipantKnowledge(id)!;
const scene = () =>
  buildScene(
    {
      grid: useMapStore.getState().grid,
      units: useUnitsStore.getState().units,
      buildings: useBuildingsStore.getState().buildings,
      sites: {},
    },
    { mode: 'participant', viewer: 'p1', knowledge: known('p1') },
  );

it('до открытия рабочий, сцена и наблюдение ИИ не узнают богатство', () => {
  expect(known('p1').visible[310]).toBe(1);
  expect(isKnownRichGold(known('p1'), 10, 10)).toBe(false);
  expect(scene().grid[10][10]).not.toHaveProperty('rich');
  expect(getObservation('p1').knownRichGold?.[10][10]).toBe(false);
  expect(getObservation('p1').knownTerrain[10][10]).toBe('gold');
});

it('реальный доход 15 до открытия и 25 после; союзники делят знание, но не ресурсы', () => {
  const before = structuredClone(useEconomyStore.getState().resources);
  expect(nextTurn('p1').ok).toBe(true);
  expect(useEconomyStore.getState().resources.p1.gold).toBe(
    before.p1.gold + 15,
  );
  expect(nextTurn('p2').ok).toBe(true);
  expect(nextTurn('p3').ok).toBe(true);
  expect(move({ actor: 'p1', unitId: scout, x: 10, y: 4 }).ok).toBe(true);
  expect(isKnownRichGold(known('p1'), 10, 10)).toBe(true);
  expect(isKnownRichGold(known('p2'), 10, 10)).toBe(true);
  expect(isKnownRichGold(known('p3'), 10, 10)).toBe(false);
  expect(scene().grid[10][10].rich).toBe(true);
  expect(getObservation('p1').knownRichGold?.[10][10]).toBe(true);
  expect(nextTurn('p1').ok).toBe(true);
  expect(useEconomyStore.getState().resources.p1.gold).toBe(
    before.p1.gold + 40,
  );
  expect(useEconomyStore.getState().resources.p2).toEqual(before.p2);
});

it('обелиск не открывает богатство и не стирает уже открытую жилу', () => {
  useUnitsStore.getState().placeUnit(scout, 2, 10);
  useSitesStore
    .getState()
    .setSites([{ id: 'obelisk', type: 'obelisk', x: 3, y: 10 }]);
  expect(move({ actor: 'p1', unitId: scout, x: 3, y: 10 }).ok).toBe(true);
  expect(known('p1').terrain[310]).toBe(7);
  useUnitsStore.getState().placeUnit(scout, 10, 4);
  expect(isKnownRichGold(known('p1'), 10, 10)).toBe(true);
  useUnitsStore.getState().placeUnit(scout, 2, 10);
  useSitesStore
    .getState()
    .setSites([{ id: 'second', type: 'obelisk', x: 3, y: 10 }]);
  expect(move({ actor: 'p1', unitId: scout, x: 3, y: 10 }).ok).toBe(true);
  expect(isKnownRichGold(known('p1'), 10, 10)).toBe(true);
  expect(known('p1').visible[310]).toBe(1);
});
