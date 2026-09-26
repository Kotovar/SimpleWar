import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { getVisibleRecords, useJournalStore } from '@entities/journals';
import { attack } from '@features/combat';
import { move } from '@features/pathfinding';
import { initGameLoopEvents } from '@features/game-loop';
import { initPopulationSystem } from './population';
import { initJournalSystem } from './journal';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const journal = () => useJournalStore.getState();
const types = (viewer: 'p1' | 'p2') =>
  getVisibleRecords(journal().entries, viewer).map(({ type }) => type);

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useEconomyStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 3,
    winner: null,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  initGameLoopEvents();
  initPopulationSystem();
  initJournalSystem();
  buildings().spawnBuilding('base', 0, 0, 'p1');
  buildings().spawnBuilding('base', 6, 6, 'p2');
  journal().newGame();
});

const readySoldier = (x: number, y: number) => {
  const id = units().spawnUnit('archer', x, y, 'p1')!;
  units().resetUnitsForNewTurn('p1');
  return id;
};

describe('journal of game outcomes', () => {
  it('shows a death to both sides but the order only to the attacker', () => {
    const target = units().spawnUnit('worker', 3, 3, 'p2')!;
    units().damageUnit(target, 20);
    const archer = readySoldier(3, 1);

    attack({ actor: 'p1', attackerId: archer, targetId: target });

    expect(journal().entries).toMatchObject([
      { type: 'unitDestroyed', actor: 'p1', turn: 3 },
      { type: 'attack', actor: 'p1', turn: 3 },
    ]);
    expect(journal().entries[0].details).toEqual({
      owner: 'p2',
      unitType: 'worker',
      x: 3,
      y: 3,
    });
    expect(types('p1')).toEqual(['unitDestroyed', 'attack']);
    expect(types('p2')).toEqual(['unitDestroyed']);
  });

  it('keeps enemy orders out of the ordinary journal', () => {
    useGameLoopStore.setState({ activePlayer: 'p2' });
    const scout = units().spawnUnit('worker', 5, 5, 'p2', true)!;

    move({ actor: 'p2', unitId: scout, x: 4, y: 5 });

    expect(journal().entries).toHaveLength(1);
    expect(types('p1')).toEqual([]);
  });

  it('records elimination and the outcome for everyone', () => {
    const base = buildings().getProductionBuildings('p2')[0];
    buildings().damageBuilding(base.id, base.hp - 1);
    const archer = readySoldier(4, 5);

    attack({ actor: 'p1', attackerId: archer, targetId: base.id });

    expect(journal().entries.map(({ type }) => type)).toEqual([
      'buildingDestroyed',
      'eliminated',
      'gameOver',
      'attack',
    ]);
    expect(journal().entries[2].details).toEqual({ winner: 'p1' });
    expect(types('p2')).toEqual([
      'buildingDestroyed',
      'eliminated',
      'gameOver',
    ]);
  });

  it('does not duplicate elimination on a repeated event', () => {
    useGameLoopStore.setState({
      participants: [
        { id: 'p1', controller: 'human' },
        { id: 'p2', controller: 'ai' },
        { id: 'p3', controller: 'ai' },
      ],
    });
    gameEvents.emit({ type: 'BASE_DESTROYED', owner: 'p3' });
    gameEvents.emit({ type: 'BASE_DESTROYED', owner: 'p3' });

    expect(journal().entries.map(({ type }) => type)).toEqual(['eliminated']);
  });

  it('clears errors without touching the game and isolates a new game', () => {
    const archer = readySoldier(1, 1);
    attack({ actor: 'p1', attackerId: archer, targetId: 'missing' });
    const game = {
      units: units().units,
      buildings: buildings().buildings,
      loop: useGameLoopStore.getState(),
    };

    journal().clearErrors();
    expect(journal().errors).toEqual([]);
    expect(units().units).toBe(game.units);
    expect(buildings().buildings).toBe(game.buildings);
    expect(useGameLoopStore.getState()).toBe(game.loop);

    const { gameId } = journal();
    journal().newGame();
    move({ actor: 'p1', unitId: archer, x: 1, y: 2 });
    expect(journal().entries).toMatchObject([
      { type: 'move', gameId: gameId + 1 },
    ]);
  });
});
