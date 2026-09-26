import {
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
} from 'vite-plus/test';
import { gameEvents } from '@shared/lib';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useJournalStore } from '@entities/journals';
import { move } from '@features/pathfinding';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { attack } from '@features/combat';
import { initGameLoopEvents, nextTurn } from '@features/game-loop';
import { initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const economy = () => useEconomyStore.getState();

/** Ссылки на состояние: Immer сохраняет их, если команда ничего не изменила. */
const snapshot = () => ({
  units: units().units,
  buildings: buildings().buildings,
  resources: economy().resources,
  population: economy().populationCap,
  loop: useGameLoopStore.getState().activePlayer,
});

let base = '';

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  economy().resetStore();
  useJournalStore.getState().newGame();
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
  base = buildings().spawnBuilding('base', 0, 0, 'p1')!;
  buildings().resetBuildingsForNewTurn('p1');
  buildings().spawnBuilding('base', 6, 6, 'p2');
});

describe('command rejections leave the state unchanged', () => {
  it('rejects recruitment reentered from a creation event before payment', () => {
    economy().removeResources('p1', { gold: 160, wood: 80 });
    const command = {
      actor: 'p1',
      buildingId: base,
      unitType: 'worker',
      x: 1,
      y: 0,
    } as const;
    let nested: ReturnType<typeof spawn> | undefined;
    const unsubscribe = gameEvents.subscribe(event => {
      if (event.type !== 'UNIT_SPAWNED') return;
      unsubscribe();
      nested = spawn({ ...command, x: 0, y: 1 });
    });
    onTestFinished(unsubscribe);

    expect(spawn(command)).toEqual({ ok: true });
    expect(nested).toMatchObject({ ok: false, code: 'busy' });
    expect(Object.values(units().units)).toHaveLength(1);
    expect(economy().resources.p1).toEqual({ gold: 0, wood: 0 });
  });

  const cases = [
    {
      name: 'foreign unit',
      code: 'owner',
      run: () => {
        const id = units().spawnUnit('worker', 3, 3, 'p2', true)!;
        return () => move({ actor: 'p1', unitId: id, x: 3, y: 4 });
      },
    },
    {
      name: 'foreign turn',
      code: 'turn',
      run: () => {
        const id = units().spawnUnit('worker', 3, 3, 'p2', true)!;
        return () => move({ actor: 'p2', unitId: id, x: 3, y: 4 });
      },
    },
    {
      name: 'occupied cell',
      code: 'occupied',
      run: () => {
        const id = units().spawnUnit('worker', 3, 3, 'p1', true)!;
        units().spawnUnit('worker', 3, 4, 'p2');
        return () => move({ actor: 'p1', unitId: id, x: 3, y: 4 });
      },
    },
    {
      name: 'detour longer than move points',
      code: 'points',
      run: () => {
        const id = units().spawnUnit('worker', 1, 3, 'p1', true)!;
        // Стена из воды заставляет обходить: 2 клетки напрямую, 6 по пути.
        for (const y of [2, 3, 4]) {
          useMapStore
            .getState()
            .setCell(2, y, { type: 'water', isWalkable: false });
        }
        return () => move({ actor: 'p1', unitId: id, x: 3, y: 3 });
      },
    },
    {
      name: 'resources one short',
      code: 'resources',
      run: () => {
        const id = units().spawnUnit('worker', 3, 3, 'p1', true)!;
        // Ферме нужно 60 / 160: дерева ровно хватает, золота на 1 меньше.
        economy().removeResources('p1', { gold: 141, wood: -40 });
        return () =>
          build({
            actor: 'p1',
            workerId: id,
            buildingType: 'farm',
            x: 4,
            y: 3,
          });
      },
    },
    {
      name: 'wrong recruiter',
      code: 'actionType',
      run: () => () =>
        spawn({
          actor: 'p1',
          buildingId: base,
          unitType: 'archer',
          x: 1,
          y: 0,
        }),
    },
    {
      name: 'population limit',
      code: 'population',
      run: () => {
        economy().addUnit('p1', 10);
        return () =>
          spawn({
            actor: 'p1',
            buildingId: base,
            unitType: 'worker',
            x: 1,
            y: 0,
          });
      },
    },
    {
      name: 'own target',
      code: 'target',
      run: () => {
        const soldier = units().spawnUnit('swordsman', 3, 3, 'p1', true)!;
        const ally = units().spawnUnit('worker', 3, 4, 'p1')!;
        units().resetUnitsForNewTurn('p1');
        return () =>
          attack({ actor: 'p1', attackerId: soldier, targetId: ally });
      },
    },
    {
      name: 'ending a foreign turn',
      code: 'turn',
      run: () => () => nextTurn('p2'),
    },
  ];

  it.each(cases)('$name → $code', ({ code, run }) => {
    const execute = run();
    const before = snapshot();

    expect(execute()).toMatchObject({ ok: false, kind: 'rejected', code });
    expect(snapshot()).toEqual(before);
    expect(snapshot().units).toBe(before.units);
    expect(snapshot().resources).toBe(before.resources);
  });

  it('builds with exactly enough resources and charges only the actor', () => {
    const id = units().spawnUnit('worker', 3, 3, 'p1', true)!;
    economy().removeResources('p1', { gold: 140, wood: -40 }); // 60 / 160

    expect(
      build({ actor: 'p1', workerId: id, buildingType: 'farm', x: 4, y: 3 }),
    ).toEqual({ ok: true });
    expect(economy().resources).toMatchObject({
      p1: { gold: 0, wood: 0 },
      p2: { gold: 200, wood: 120 },
    });
  });
});
