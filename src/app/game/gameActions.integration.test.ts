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
import { createMovementGrid, getPath } from '@features/pathfinding';
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
      spawn({
        actor: owner,
        buildingId: base.id,
        unitType: 'worker',
        x: owner === 'p1' ? 1 : 5,
        y: base.y,
      });
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
    build({
      actor: 'p2',
      workerId: worker,
      buildingType: 'sawmill',
      x: 4,
      y: 3,
    });
    expect(buildings().getBuildingAt(4, 3)?.type).toBe('sawmill');
    expect(economy().resources.p2).toEqual({ gold: 140, wood: 40 });
    expect(economy().resources.p1).toEqual({ gold: 200, wood: 120 });
  });

  it('does not recruit a swordsman from a town hall', () => {
    const result = spawn({
      actor: 'p1',
      buildingId: buildings().getProductionBuildings('p1')[0].id,
      unitType: 'swordsman',
      x: 1,
      y: 0,
    });
    expect(result).toMatchObject({ ok: false, code: 'actionType' });
    expect(Object.values(units().units)).toHaveLength(0);
    expect(economy().resources.p1.gold).toBe(200);
  });

  it.each([
    { x: 1, y: 0 },
    { x: 4, y: 4 },
    { x: -1, y: 0 },
  ])('rejects occupied, remote or out-of-map recruitment: %j', target => {
    units().spawnUnit('worker', 1, 0, 'p1');
    const before = units().units;
    spawn({
      actor: 'p1',
      buildingId: buildings().getProductionBuildings('p1')[0].id,
      unitType: 'worker',
      ...target,
    });
    expect(units().units).toBe(before);
    expect(economy().resources.p1.gold).toBe(200);
  });

  it('rejects a mine on grass without charging the worker', () => {
    const worker = units().spawnUnit('worker', 1, 1, 'p1', true)!;
    const result = build({
      actor: 'p1',
      workerId: worker,
      buildingType: 'mine',
      x: 2,
      y: 1,
    });
    expect(result).toMatchObject({ ok: false, code: 'terrain' });
    expect(buildings().getBuildingAt(2, 1)).toBeNull();
    expect(economy().resources.p1.gold).toBe(200);
    expect(units().units[worker]).toMatchObject({
      buildPoints: 1,
      movePoints: 4,
    });
  });

  it('allows a farm on a hill and rejects one on a swamp', () => {
    const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;
    economy().addResources('p1', { wood: 100 });
    useMapStore.getState().setCell(2, 1, { type: 'swamp', isWalkable: true });
    useMapStore.getState().setCell(3, 2, { type: 'hill', isWalkable: true });
    expect(
      build({
        actor: 'p1',
        workerId: worker,
        buildingType: 'farm',
        x: 2,
        y: 1,
      }),
    ).toMatchObject({ ok: false, code: 'terrain' });
    expect(buildings().getBuildingAt(2, 1)).toBeNull();
    expect(
      build({
        actor: 'p1',
        workerId: worker,
        buildingType: 'farm',
        x: 3,
        y: 2,
      }),
    ).toMatchObject({ ok: true });
    expect(buildings().getBuildingAt(3, 2)?.type).toBe('farm');
  });
});

describe('combat', () => {
  it('lets a tower attack once within range', () => {
    const tower = buildings().spawnBuilding('tower', 2, 2, 'p1')!;
    buildings().resetBuildingsForNewTurn('p1');
    const target = units().spawnUnit('worker', 4, 2, 'p2')!;
    attack({ actor: 'p1', attackerId: tower, targetId: target });
    expect(units().units[target].hp).toBe(5);
    attack({ actor: 'p1', attackerId: tower, targetId: target });
    expect(units().units[target].hp).toBe(5);
  });

  it('rejects an out-of-range target even without UI validation', () => {
    const soldier = units().spawnUnit('swordsman', 1, 1, 'p1')!;
    const target = units().spawnUnit('worker', 4, 4, 'p2')!;
    units().resetUnitsForNewTurn('p1');
    attack({ actor: 'p1', attackerId: soldier, targetId: target });
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
      attack({ actor: owner, attackerId: soldier, targetId: base.id });
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
      nextTurn('p1');
      expect(economy().resources.p1.gold).toBe(200);
    },
  );

  it('clears recruitment in the common reset action', () => {
    units().selectUnitForSpawn('archer');
    useSelectionStore.getState().selectCell(1, 1);
    useMovementStore.setState({
      reachableCells: [{ x: 1, y: 1 }],
      attackableTargets: [{ x: 2, y: 2 }],
    });
    useHighlightStore.setState({
      spawnableCells: [{ x: 1, y: 0 }],
      buildableCells: [{ x: 0, y: 1 }],
    });
    resetGame();
    expect(useSelectionStore.getState().selection).toBeNull();
    expect(useMovementStore.getState()).toMatchObject({
      reachableCells: null,
      attackableTargets: null,
    });
    expect(useHighlightStore.getState()).toMatchObject({
      spawnableCells: null,
      buildableCells: null,
    });
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

    nextTurn('p1');

    expect(economy().resources).toMatchObject({
      p1: { gold: 203 },
      p2: { gold: 200 },
      p3: { gold: 200 },
    });
    expect(useGameLoopStore.getState().activePlayer).toBe('p2');
    expect(units().units[second].movePoints).toBe(4);
    expect(units().units[third].movePoints).toBe(0);

    nextTurn('p2');
    nextTurn('p3');
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

    move({ actor: 'p1', unitId: foreign, x: 1, y: 4 });
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

    attack({ actor: 'p1', attackerId: soldier, targetId: base.id });

    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'inProgress',
      eliminated: ['p3'],
      winner: null,
    });
    expect(units().units[doomed]).toBeUndefined();
    expect(buildings().getProductionBuildings('p3')).toEqual([]);

    nextTurn('p1');
    nextTurn('p2');
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
  it('charges two points to enter a hill and refuses it with one point left', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'p1', true)!;
    expect(move({ actor: 'p1', unitId: worker, x: 2, y: 2 })).toMatchObject({
      ok: true,
    });
    useMapStore.getState().setCell(3, 2, { type: 'hill', isWalkable: true });
    expect(move({ actor: 'p1', unitId: worker, x: 3, y: 2 })).toMatchObject({
      ok: true,
    });
    expect(units().units[worker].movePoints).toBe(1);
    useMapStore.getState().setCell(4, 2, { type: 'swamp', isWalkable: true });
    expect(move({ actor: 'p1', unitId: worker, x: 4, y: 2 })).toMatchObject({
      ok: false,
      code: 'points',
    });
    expect(units().units[worker]).toMatchObject({ x: 3, y: 2, movePoints: 1 });
  });

  it('charges the actual four-cell detour instead of two-cell direct distance', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'p1', true)!;
    useMapStore.getState().setCell(2, 2, { type: 'water', isWalkable: false });
    move({ actor: 'p1', unitId: worker, x: 3, y: 2 });
    expect(units().units[worker]).toMatchObject({ x: 3, y: 2, movePoints: 0 });
  });

  it('does not move into an occupied cell', () => {
    const worker = units().spawnUnit('worker', 1, 2, 'p1', true)!;
    units().spawnUnit('worker', 2, 2, 'p2');
    move({ actor: 'p1', unitId: worker, x: 2, y: 2 });
    expect(units().units[worker]).toMatchObject({ x: 1, y: 2, movePoints: 4 });
  });
});

describe('game initialization', () => {
  it('reproduces the prepared map and fallback decision from a fixed seed', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 0 });
    expect(initializeGame()).toBe(true);
    const first = {
      grid: useMapStore.getState().grid,
      seed: useMapStore.getState().seed,
      usedFallback: useMapStore.getState().usedFallback,
    };
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 0 });
    expect(initializeGame()).toBe(true);
    expect(useMapStore.getState()).toMatchObject(first);
  });

  it('keeps the high bits of a safe-integer seed', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 7 });
    expect(initializeGame()).toBe(true);
    const low = useMapStore.getState().grid;
    resetGame();
    useSettingsStore.setState({
      mapGenerationMode: 'fixed',
      customSeed: 0x100000007,
    });
    expect(initializeGame()).toBe(true);
    expect(useMapStore.getState().grid).not.toEqual(low);
  });

  it('creates a connected base and worker for each participant', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 3 });
    const participants: Participant[] = [
      { id: 'p1', controller: 'human' },
      { id: 'p2', controller: 'ai' },
      { id: 'p3', controller: 'ai' },
      { id: 'p4', controller: 'ai' },
    ];
    expect(initializeGame(participants)).toBe(true);
    expect(
      Object.values(buildings().buildings)
        .map(({ owner }) => owner)
        .sort(),
    ).toEqual(participants.map(({ id }) => id));
    expect(
      Object.values(units().units)
        .map(({ owner }) => owner)
        .sort(),
    ).toEqual(participants.map(({ id }) => id));
  });

  it('rejects overlapping start zones before creating objects', () => {
    resetGame();
    useSettingsStore.setState({ gridColumns: 5, gridRows: 5 });
    expect(
      initializeGame([
        { id: 'p1', controller: 'human' },
        { id: 'p2', controller: 'ai' },
        { id: 'p3', controller: 'ai' },
      ]),
    ).toBe(false);
    expect(Object.values(buildings().buildings)).toHaveLength(0);
    expect(Object.values(units().units)).toHaveLength(0);
  });

  it('rejects invalid map settings without spawning objects', () => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: -1 });
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
    const grid = createMovementGrid(useMapStore.getState().grid);
    grid[workers[1].y][workers[1].x] = 1;
    expect(getPath(workers[0], workers[1], grid).path.length).toBeGreaterThan(
      0,
    );
    initializeGame();
    expect(units().units).toBe(original);
  });
});
