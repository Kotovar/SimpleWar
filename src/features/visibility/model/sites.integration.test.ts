import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant, Site } from '@shared/config';
import { restoreGameState } from '@shared/lib';
import { createUnit, useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSitesStore } from '@entities/sites';
import { useGameLoopStore } from '@entities/games';
import { useKnowledgeStore } from '@entities/perceptions';
import { initVisibilitySystem } from './refreshKnowledge';

const grid: Cell[][] = [
  Array.from({ length: 30 }, (_, x) => ({
    x,
    y: 0,
    type: 'grass',
    isWalkable: true,
  })),
];
const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 1 },
  { id: 'p3', controller: 'ai', team: 2 },
];
const camp: Site = { id: 'camp', type: 'camp', x: 2, y: 0, hiresLeft: 3 };
const scout = createUnit('scout', 1, 0, 'p2', false)!;
const known = (id: 'p1' | 'p2' | 'p3') =>
  useKnowledgeStore.getState().byParticipant[id]!.sites;

const reset = () =>
  restoreGameState(() => {
    useUnitsStore.getState().resetStore();
    useBuildingsStore.getState().resetStore();
    useSitesStore.getState().resetStore();
    useKnowledgeStore.getState().resetStore();
    useMapStore.getState().resetStore();
    useGameLoopStore.getState().resetGame();
  });

beforeEach(() => {
  reset();
  restoreGameState(() => {
    useMapStore.setState({ grid });
    useGameLoopStore.setState({
      participants,
      eliminated: [],
      activePlayer: 'p1',
      phase: 'inProgress',
      currentTurn: 1,
    });
    useUnitsStore.setState({ units: { [scout.id]: scout } });
    useSitesStore.getState().setSites([camp]);
  });
  initVisibilitySystem();
});
afterEach(reset);

it('общий обзор даёт находку обоим союзникам, но не противнику', () => {
  expect(known('p1')).toEqual({ camp });
  expect(known('p2')).toEqual({ camp });
  expect(known('p3')).toEqual({});
  useSitesStore.getState().setSites([{ ...camp, hiresLeft: 2 }]);
  expect(known('p1').camp).toMatchObject({ hiresLeft: 2 });
  expect(known('p2')).toEqual(known('p1'));
});

it('союзники помнят исчезнувшую в тумане находку до повторного обзора', () => {
  useUnitsStore.setState({ units: { [scout.id]: { ...scout, x: 20 } } });
  useSitesStore.getState().setSites([]);
  expect(known('p1')).toEqual({ camp });
  expect(known('p2')).toEqual({ camp });
  useUnitsStore.setState({ units: { [scout.id]: scout } });
  expect(known('p1')).toEqual({});
  expect(known('p2')).toEqual({});
});
