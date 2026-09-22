import { beforeEach, describe, expect, it } from 'vitest';
import type { Cell, Owner } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { useSelectionStore } from '@features/selection';
import {
  move,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { attack } from '@features/combat';
import {
  initGameLoopEvents,
  nextTurn,
  resetGame,
  useGameLoopStore,
} from '@features/game-loop';
import { initializeGame } from '@widgets/start-game';
import { useSettingsStore } from '@entities/settings';
import { createMovementPFGrid, getPath } from '@features/pathfinding';
import { initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const economy = () => useEconomyStore.getState();

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useSelectionStore.getState().resetStore();
  useHighlightStore.getState().resetStore();
  useMovementStore.getState().resetStore();
  economy().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'player',
    currentTurn: 1,
    winner: null,
  });
  const grid: Cell[][] = Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid, width: 7, height: 7 });
  initPopulationSystem();
  initGameLoopEvents();
  buildings().spawnBuilding('base', 0, 0, 'player');
  buildings().spawnBuilding('base', 6, 6, 'ai');
});

describe('construction and recruitment', () => {
  it.each<Owner>(['player', 'ai'])(
    'charges the %s owner for recruitment',
    owner => {
      useGameLoopStore.setState({ activePlayer: owner });
      const base = buildings().getProductionBuildings(owner)[0];
      units().selectUnitForSpawn('worker');
      spawn(base.id, owner === 'player' ? 1 : 5, base.y, owner);
      expect(economy().resources[owner]).toEqual({ gold: 160, wood: 80 });
      expect(economy().resources[owner === 'player' ? 'ai' : 'player']).toEqual(
        { gold: 200, wood: 120 },
      );
      expect(economy().populationCap[owner].occupied).toBe(1);
    },
  );

  it('charges the AI for construction instead of the player', () => {
    useGameLoopStore.setState({ activePlayer: 'ai' });
    const worker = units().spawnUnit('worker', 4, 4, 'ai', true)!;
    useMapStore.getState().setCell(4, 3, { type: 'forest', isWalkable: false });
    buildings().selectBuildingForSpawn('sawmill');
    build(worker, 4, 3, 'ai');
    expect(buildings().getBuildingAt(4, 3)?.type).toBe('sawmill');
    expect(economy().resources.ai).toEqual({ gold: 140, wood: 40 });
    expect(economy().resources.player).toEqual({ gold: 200, wood: 120 });
  });

  it('does not recruit a swordsman from a town hall with stale selection', () => {
    units().selectUnitForSpawn('swordsman');
    spawn(buildings().getProductionBuildings('player')[0].id, 1, 0, 'player');
    expect(Object.values(units().units)).toHaveLength(0);
    expect(economy().resources.player.gold).toBe(200);
  });

  it.each([
    { x: 1, y: 0 },
    { x: 4, y: 4 },
    { x: -1, y: 0 },
  ])('rejects occupied, remote or out-of-map recruitment: %j', target => {
    units().spawnUnit('worker', 1, 0, 'player');
    units().selectUnitForSpawn('worker');
    const before = units().units;
    spawn(
      buildings().getProductionBuildings('player')[0].id,
      target.x,
      target.y,
      'player',
    );
    expect(units().units).toBe(before);
    expect(economy().resources.player.gold).toBe(200);
  });

  it('rejects a mine on grass without charging the worker', () => {
    const worker = units().spawnUnit('worker', 1, 1, 'player', true)!;
    buildings().selectBuildingForSpawn('mine');
    build(worker, 2, 1, 'player');
    expect(buildings().getBuildingAt(2, 1)).toBeNull();
    expect(economy().resources.player.gold).toBe(200);
    expect(units().units[worker]).toMatchObject({
      buildPoints: 1,
      movePoints: 4,
    });
  });
});

describe('combat', () => {
  it('lets a tower attack once within range', () => {
    const tower = buildings().spawnBuilding('tower', 2, 2, 'player')!;
    buildings().resetBuildingsForNewTurn();
    const target = units().spawnUnit('worker', 4, 2, 'ai')!;
    attack(tower, target);
    expect(units().units[target].hp).toBe(5);
    attack(tower, target);
    expect(units().units[target].hp).toBe(5);
  });

  it('rejects an out-of-range target even without UI validation', () => {
    const soldier = units().spawnUnit('swordsman', 1, 1, 'player')!;
    const target = units().spawnUnit('worker', 4, 4, 'ai')!;
    units().resetUnitsForNewTurn();
    attack(soldier, target);
    expect(units().units[target].hp).toBe(25);
    expect(units().units[soldier]).toMatchObject({ attackPoints: 1 });
  });

  it.each<Owner>(['player', 'ai'])(
    'declares %s winner after the enemy town hall is destroyed',
    owner => {
      useGameLoopStore.setState({ activePlayer: owner });
      const enemy = owner === 'player' ? 'ai' : 'player';
      const base = buildings().getProductionBuildings(enemy)[0];
      buildings().damageBuilding(base.id, 690);
      const soldier = units().spawnUnit(
        'swordsman',
        base.x,
        owner === 'player' ? 5 : 1,
        owner,
      )!;
      units().resetUnitsForNewTurn();
      attack(soldier, base.id);
      expect(useGameLoopStore.getState()).toMatchObject({
        phase: 'gameOver',
        winner: owner,
      });
    },
  );
});

describe('turn and reset boundaries', () => {
  it.each(['setup', 'gameOver'] as const)(
    'does not pay income outside a running game: %s',
    phase => {
      useGameLoopStore.setState({ phase });
      nextTurn();
      expect(economy().resources.player.gold).toBe(200);
    },
  );

  it('clears recruitment in the common reset action', () => {
    units().selectUnitForSpawn('archer');
    resetGame();
    expect(units().selectedUnitForSpawn).toBeNull();
    expect(units().units).toEqual({});
    expect(buildings().buildings).toEqual({});
    expect(useMapStore.getState().grid).toEqual([]);
  });
});

describe('movement', () => {
  it('charges the actual four-cell detour instead of two-cell direct distance', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'player', true)!;
    useMapStore.getState().setCell(2, 2, { type: 'water', isWalkable: false });
    move(worker, 3, 2);
    expect(units().units[worker]).toMatchObject({ x: 3, y: 2, movePoints: 0 });
  });

  it('does not move into an occupied cell', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'player', true)!;
    units().spawnUnit('worker', 2, 2, 'ai');
    move(worker, 2, 2);
    expect(units().units[worker]).toMatchObject({ x: 1, y: 2, movePoints: 4 });
  });
});

describe('game initialization', () => {
  it('rejects an isolated fixed map without spawning objects', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 0.15 });
    useGameLoopStore.getState().startGame();
    initializeGame();
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'setup',
      startError: expect.any(String),
    });
    expect(units().units).toEqual({});
    expect(buildings().buildings).toEqual({});
    expect(useMapStore.getState().grid).toEqual([]);
  });

  it('starts a connected map once and keeps its objects on repeated initialization', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 0 });
    useGameLoopStore.getState().startGame();
    initializeGame();
    expect(useGameLoopStore.getState().phase).toBe('inProgress');
    const original = units().units;
    expect(Object.values(original)).toHaveLength(2);
    expect(Object.values(buildings().buildings)).toHaveLength(2);
    const workers = Object.values(original);
    const grid = createMovementPFGrid(useMapStore.getState().grid);
    grid.setWalkableAt(workers[1].x, workers[1].y, true);
    expect(getPath(workers[0], workers[1], grid).length).toBeGreaterThan(0);
    initializeGame();
    expect(units().units).toBe(original);
  });
});
