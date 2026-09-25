import {
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
} from 'vite-plus/test';
import {
  DEFAULT_PARTICIPANTS,
  type Cell,
  type Owner,
  type Participant,
} from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useSelectionStore } from '@features/selection';
import {
  getEnemyTargets,
  move,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { attack } from '@features/combat';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initializeGame } from '@widgets/start-game';
import { gameEvents } from '@shared/lib';
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
    activePlayer: 'p1',
    currentTurn: 1,
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
  initPopulationSystem();
  initGameLoopEvents();
  buildings().spawnBuilding('base', 0, 0, 'p1');
  buildings().spawnBuilding('base', 6, 6, 'p2');
});

describe('construction and recruitment', () => {
  it.each<Owner>(['p1', 'p2'])(
    'charges the %s owner for recruitment',
    owner => {
      useGameLoopStore.setState({ activePlayer: owner });
      const base = buildings().getProductionBuildings(owner)[0];
      units().selectUnitForSpawn('worker');
      spawn(base.id, owner === 'p1' ? 1 : 5, base.y, owner);
      expect(economy().resources[owner]).toEqual({ gold: 160, wood: 80 });
      expect(economy().resources[owner === 'p1' ? 'p2' : 'p1']).toEqual({
        gold: 200,
        wood: 120,
      });
      expect(economy().populationCap[owner].occupied).toBe(1);
    },
  );

  it('charges the AI for construction instead of the player', () => {
    useGameLoopStore.setState({ activePlayer: 'p2' });
    const worker = units().spawnUnit('worker', 4, 4, 'p2', true)!;
    useMapStore.getState().setCell(4, 3, { type: 'forest', isWalkable: false });
    buildings().selectBuildingForSpawn('sawmill');
    build(worker, 4, 3, 'p2');
    expect(buildings().getBuildingAt(4, 3)?.type).toBe('sawmill');
    expect(economy().resources.p2).toEqual({ gold: 140, wood: 40 });
    expect(economy().resources.p1).toEqual({ gold: 200, wood: 120 });
  });

  it('does not recruit a swordsman from a town hall with stale selection', () => {
    units().selectUnitForSpawn('swordsman');
    spawn(buildings().getProductionBuildings('p1')[0].id, 1, 0, 'p1');
    expect(Object.values(units().units)).toHaveLength(0);
    expect(economy().resources.p1.gold).toBe(200);
  });

  it.each([
    { x: 1, y: 0 },
    { x: 4, y: 4 },
    { x: -1, y: 0 },
  ])('rejects occupied, remote or out-of-map recruitment: %j', target => {
    units().spawnUnit('worker', 1, 0, 'p1');
    units().selectUnitForSpawn('worker');
    const before = units().units;
    spawn(
      buildings().getProductionBuildings('p1')[0].id,
      target.x,
      target.y,
      'p1',
    );
    expect(units().units).toBe(before);
    expect(economy().resources.p1.gold).toBe(200);
  });

  it('rejects a mine on grass without charging the worker', () => {
    const worker = units().spawnUnit('worker', 1, 1, 'p1', true)!;
    buildings().selectBuildingForSpawn('mine');
    build(worker, 2, 1, 'p1');
    expect(buildings().getBuildingAt(2, 1)).toBeNull();
    expect(economy().resources.p1.gold).toBe(200);
    expect(units().units[worker]).toMatchObject({
      buildPoints: 1,
      movePoints: 4,
    });
  });
});

describe('combat', () => {
  it('lets a tower attack once within range', () => {
    const tower = buildings().spawnBuilding('tower', 2, 2, 'p1')!;
    buildings().resetBuildingsForNewTurn('p1');
    const target = units().spawnUnit('worker', 4, 2, 'p2')!;
    attack(tower, target);
    expect(units().units[target].hp).toBe(5);
    attack(tower, target);
    expect(units().units[target].hp).toBe(5);
  });

  it('rejects an out-of-range target even without UI validation', () => {
    const soldier = units().spawnUnit('swordsman', 1, 1, 'p1')!;
    const target = units().spawnUnit('worker', 4, 4, 'p2')!;
    units().resetUnitsForNewTurn('p1');
    attack(soldier, target);
    expect(units().units[target].hp).toBe(25);
    expect(units().units[soldier]).toMatchObject({ attackPoints: 1 });
  });

  it.each<Owner>(['p1', 'p2'])(
    'declares %s winner after the enemy town hall is destroyed',
    owner => {
      useGameLoopStore.setState({ activePlayer: owner });
      const enemy = owner === 'p1' ? 'p2' : 'p1';
      const base = buildings().getProductionBuildings(enemy)[0];
      buildings().damageBuilding(base.id, 690);
      const soldier = units().spawnUnit(
        'swordsman',
        base.x,
        owner === 'p1' ? 5 : 1,
        owner,
      )!;
      units().resetUnitsForNewTurn(owner);
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
      expect(economy().resources.p1.gold).toBe(200);
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

describe('three participants', () => {
  const THREE: Participant[] = [
    { id: 'p1', controller: 'human' },
    { id: 'p2', controller: 'ai' },
    { id: 'p3', controller: 'ai' },
  ];

  beforeEach(() => {
    useGameLoopStore.setState({ participants: THREE });
    buildings().spawnBuilding('base', 0, 6, 'p3');
  });

  it('pays income once to the owner and restores points only for the next side', () => {
    const own = units().spawnUnit('worker', 1, 1, 'p1', true)!;
    const second = units().spawnUnit('worker', 5, 5, 'p2')!;
    const third = units().spawnUnit('worker', 1, 5, 'p3')!;

    nextTurn();

    expect(economy().resources).toMatchObject({
      p1: { gold: 203 },
      p2: { gold: 200 },
      p3: { gold: 200 },
    });
    expect(useGameLoopStore.getState().activePlayer).toBe('p2');
    expect(units().units[second].movePoints).toBe(4);
    expect(units().units[third].movePoints).toBe(0);

    nextTurn();
    nextTurn();
    expect(useGameLoopStore.getState()).toMatchObject({
      activePlayer: 'p1',
      currentTurn: 2,
    });
    expect(economy().resources.p3.gold).toBe(203);
    expect(units().units[own].movePoints).toBe(4);
  });

  it('targets every hostile participant and refuses orders for foreign units', () => {
    units().spawnUnit('worker', 5, 5, 'p2');
    const foreign = units().spawnUnit('worker', 1, 5, 'p3', true)!;

    const owners = new Set(getEnemyTargets('p1').map(({ owner }) => owner));
    expect(owners).toEqual(new Set(['p2', 'p3']));

    move(foreign, 1, 4);
    expect(units().units[foreign]).toMatchObject({ x: 1, y: 5 });
  });

  it('restores points for the next side when the active side is eliminated', () => {
    useGameLoopStore.setState({ activePlayer: 'p2' });
    const next = units().spawnUnit('worker', 1, 5, 'p3')!;

    gameEvents.emit({ type: 'BASE_DESTROYED', owner: 'p2' });

    expect(useGameLoopStore.getState()).toMatchObject({
      activePlayer: 'p3',
      phase: 'inProgress',
    });
    expect(units().units[next].movePoints).toBe(4);
    expect(economy().resources.p2.gold).toBe(200);
  });

  it('eliminates a side without ending the match early and skips its turn', () => {
    const doomed = units().spawnUnit('worker', 1, 5, 'p3')!;
    const base = buildings().getProductionBuildings('p3')[0];
    buildings().damageBuilding(base.id, 690);
    const soldier = units().spawnUnit('archer', 0, 4, 'p1')!;
    units().resetUnitsForNewTurn('p1');

    attack(soldier, base.id);

    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'inProgress',
      eliminated: ['p3'],
      winner: null,
    });
    expect(units().units[doomed]).toBeUndefined();
    expect(buildings().getProductionBuildings('p3')).toEqual([]);

    nextTurn();
    nextTurn();
    expect(useGameLoopStore.getState()).toMatchObject({
      activePlayer: 'p1',
      currentTurn: 2,
    });

    resetGame();
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'setup',
      participants: DEFAULT_PARTICIPANTS,
      eliminated: [],
    });
  });
});

describe('movement', () => {
  it('charges the actual four-cell detour instead of two-cell direct distance', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'p1', true)!;
    useMapStore.getState().setCell(2, 2, { type: 'water', isWalkable: false });
    move(worker, 3, 2);
    expect(units().units[worker]).toMatchObject({ x: 3, y: 2, movePoints: 0 });
  });

  it('does not move into an occupied cell', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'p1', true)!;
    units().spawnUnit('worker', 2, 2, 'p2');
    move(worker, 2, 2);
    expect(units().units[worker]).toMatchObject({ x: 1, y: 2, movePoints: 4 });
  });
});

describe('game initialization', () => {
  it('rejects an isolated fixed map without spawning objects', () => {
    resetGame();
    // На карте 30 × 30 этот сид не даёт допустимого прохода и ресурсов.
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 0 });
    expect(initializeGame()).toBe(false);
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'setup',
      startError: expect.any(String),
    });
    expect(units().units).toEqual({});
    expect(buildings().buildings).toEqual({});
    expect(useMapStore.getState().grid).toEqual([]);
  });

  it('starts on the minimum 5 × 5 map', () => {
    const { gridColumns, gridRows } = useSettingsStore.getState();
    onTestFinished(() => useSettingsStore.setState({ gridColumns, gridRows }));
    resetGame();
    useSettingsStore.setState({
      mapGenerationMode: 'fixed',
      customSeed: 3,
      gridColumns: 5,
      gridRows: 5,
    });
    expect(initializeGame()).toBe(true);
    useGameLoopStore.getState().startGame();
    expect(useGameLoopStore.getState().phase).toBe('inProgress');
    expect(Object.values(buildings().buildings)).toHaveLength(2);
  });

  it('starts with the default fixed seed once and keeps its objects on repeated initialization', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed' });
    expect(initializeGame()).toBe(true);
    useGameLoopStore.getState().startGame();
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
