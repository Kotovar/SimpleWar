import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  BUILDINGS_CONFIG,
  DEFAULT_PARTICIPANTS,
  type Cell,
  type Participant,
} from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { resetGame } from '@features/game-loop';
import { initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const economy = () => useEconomyStore.getState();
const debug = () => useDebugStore.getState();

const THREE: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
];

let worker = '';

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  economy().resetStore();
  debug().resetStore();
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
  worker = units().spawnUnit('worker', 3, 3, 'p1', true)!;
  // Ноль ресурсов: без бесплатности ни одна стройка не проходит.
  economy().removeResources('p1', { gold: 200, wood: 120 });
});

const buildFarm = (x = 4, y = 3) =>
  build({ actor: 'p1', workerId: worker, buildingType: 'farm', x, y });

describe('debug exceptions', () => {
  it('keeps normal prices while the mode is off', () => {
    debug().setException(['p1'], 'freeBuild', true);

    expect(buildFarm()).toMatchObject({ ok: false, code: 'resources' });
  });

  it('builds for free with zero resources, instantly, and logs the exception', () => {
    debug().setEnabled(true);
    debug().setException(['p1'], 'freeBuild', true);
    debug().setException(['p1'], 'instantBuild', true);

    expect(buildFarm()).toEqual({ ok: true });
    expect(buildings().getBuildingAt(4, 3)?.type).toBe('farm');
    expect(economy().resources.p1).toEqual({ gold: 0, wood: 0 });
    expect(units().units[worker]).toMatchObject({ buildPoints: 0 });
    expect(useJournalStore.getState().entries.at(-1)).toMatchObject({
      type: 'build',
      actor: 'p1',
      turn: 1,
      details: { debug: 'freeBuild,instantBuild' },
    });
  });

  it('still rejects an occupied cell and a lack of population', () => {
    debug().setEnabled(true);
    debug().setException(['p1'], 'freeBuild', true);
    debug().setException(['p1'], 'freeSpawn', true);
    units().spawnUnit('worker', 4, 3, 'p1');
    const base = buildings().spawnBuilding('base', 0, 0, 'p1')!;
    buildings().resetBuildingsForNewTurn('p1');
    economy().addUnit('p1', 10);
    const before = {
      units: units().units,
      buildings: buildings().buildings,
      resources: economy().resources,
      population: economy().populationCap,
    };

    expect(buildFarm()).toMatchObject({ code: 'occupied' });
    expect(
      spawn({ actor: 'p1', buildingId: base, unitType: 'worker', x: 1, y: 0 }),
    ).toMatchObject({ code: 'population' });
    // Отклонённая команда ничего не создаёт и не тратит, в том числе очки.
    expect(units().units).toBe(before.units);
    expect(buildings().buildings).toBe(before.buildings);
    expect(economy().resources).toBe(before.resources);
    expect(economy().populationCap).toBe(before.population);
  });

  it('applies exceptions to each AI independently', () => {
    useGameLoopStore.setState({ participants: THREE, activePlayer: 'p2' });
    debug().setEnabled(true);
    debug().setException(['p2'], 'freeSpawn', true);
    const second = buildings().spawnBuilding('base', 0, 0, 'p2')!;
    const third = buildings().spawnBuilding('base', 6, 6, 'p3')!;
    buildings().resetBuildingsForNewTurn('p2');
    buildings().resetBuildingsForNewTurn('p3');

    spawn({ actor: 'p2', buildingId: second, unitType: 'worker', x: 1, y: 0 });
    useGameLoopStore.setState({ activePlayer: 'p3' });
    spawn({ actor: 'p3', buildingId: third, unitType: 'worker', x: 5, y: 6 });

    expect(economy().resources).toMatchObject({
      p2: { gold: 200, wood: 120 },
      p3: { gold: 160, wood: 80 },
    });
  });

  it('applies to everyone when set for all participants', () => {
    debug().setEnabled(true);
    debug().setException(
      THREE.map(({ id }) => id),
      'freeBuild',
      true,
    );

    expect(debug().exceptions).toEqual({
      p1: ['freeBuild'],
      p2: ['freeBuild'],
      p3: ['freeBuild'],
    });
  });

  it('returns normal prices after the mode is off and keeps what was built', () => {
    debug().setEnabled(true);
    debug().setException(['p1'], 'freeBuild', true);
    buildFarm();
    debug().setEnabled(false);
    units().resetUnitsForNewTurn('p1');

    expect(buildFarm(2, 3)).toMatchObject({ code: 'resources' });
    expect(buildings().getBuildingAt(4, 3)?.type).toBe('farm');
    expect(economy().resources.p1).toEqual({ gold: 0, wood: 0 });
    expect(debug().usedInGame).toBe(true);
  });

  it('turns everything off on reset without touching the base config', () => {
    const farmCost = { ...BUILDINGS_CONFIG.farm.cost };
    debug().setEnabled(true);
    debug().setException(['p1'], 'freeBuild', true);

    resetGame();

    expect(debug()).toMatchObject({
      enabled: false,
      exceptions: {},
      usedInGame: false,
    });
    expect(BUILDINGS_CONFIG.farm.cost).toEqual(farmCost);
  });
});
