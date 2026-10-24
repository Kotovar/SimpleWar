import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant, UnitType } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useSitesStore } from '@entities/sites';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { getParticipantKnowledge } from '@entities/perceptions';
import { spawn, getCampSpawnCells } from '@features/spawn';
import { nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initPopulationSystem } from '@app/system';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 2 },
  { id: 'p3', controller: 'ai', team: 1 },
];
let scout: string;
const units = () => useUnitsStore.getState();
const sites = () => useSitesStore.getState();
const economy = () => useEconomyStore.getState();
const camp = () => sites().sites.camp;
const command = (unitType: UnitType = 'swordsman') => ({
  actor: 'p1' as const,
  campId: 'camp',
  unitType,
  x: 9,
  y: 7,
});
beforeEach(() => {
  initPopulationSystem();
  initVisibilitySystem();
  resetGame();
  const grid: Cell[][] = Array.from({ length: 22 }, (_, y) =>
    Array.from({ length: 22 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  useGameLoopStore.setState({
    participants,
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    eliminated: [],
    winner: null,
  });
  sites().setSites([{ id: 'camp', type: 'camp', x: 8, y: 7, hiresLeft: 3 }]);
  scout = units().spawnUnit('scout', 7, 7, 'p1', true)!;
  units().resetUnitsForNewTurn('p1');
  useEconomyStore.setState(s => {
    s.resources.p1 = { gold: 234, wood: 0 };
    s.resources.p2 = { gold: 1000, wood: 0 };
  });
});
afterEach(resetGame);

it.each([
  { type: 'swordsman', gold: 234 },
  { type: 'archer', gold: 286 },
] as const)(
  'нанимает $type за $gold золота без дерева, очков и изменения разведчика',
  ({ type, gold }) => {
    useEconomyStore.setState(s => {
      s.resources.p1.gold = gold;
    });
    const beforeScout = units().units[scout];
    expect(spawn(command(type))).toEqual({ ok: true });
    const hired = units().getUnitAt(9, 7)!;
    expect(hired).toMatchObject({
      type,
      owner: 'p1',
      movePoints: 0,
      attackPoints: 0,
    });
    expect(economy().resources.p1).toEqual({ gold: 0, wood: 0 });
    expect(economy().populationCap.p1.occupied).toBe(3);
    expect(camp()).toMatchObject({ hiresLeft: 2 });
    expect(units().units[scout]).toBe(beforeScout);
  },
);

it.each([
  'notFound',
  'scout',
  'campEmpty',
  'actionType',
  'resources',
  'population',
  'bounds',
  'hidden',
  'terrain',
  'distance',
  'occupied',
  'turn',
  'phase',
] as const)('отказ %s не тратит запас, ресурсы и население', reason => {
  const cmd = command();
  if (reason === 'notFound') cmd.campId = 'missing';
  if (reason === 'scout') units().placeUnit(scout, 5, 7);
  if (reason === 'campEmpty')
    useSitesStore.setState(s => {
      const c = s.sites.camp;
      if (c.type === 'camp') c.hiresLeft = 0;
    });
  if (reason === 'actionType') cmd.unitType = 'knight';
  if (reason === 'resources')
    useEconomyStore.setState(s => {
      s.resources.p1.gold = 233;
    });
  if (reason === 'population')
    useEconomyStore.setState(s => {
      s.populationCap.p1.max = 2;
    });
  if (reason === 'bounds') cmd.x = -1;
  if (reason === 'hidden')
    useUnitsStore.setState(s => {
      s.units[scout].sightRange = 0;
    });
  if (reason === 'terrain')
    useMapStore.setState(s => {
      s.grid[7][9].type = 'water';
      s.grid[7][9].isWalkable = false;
    });
  if (reason === 'distance') cmd.x = 10;
  if (reason === 'occupied') units().spawnUnit('worker', 9, 7, 'p1', true);
  if (reason === 'turn') useGameLoopStore.setState({ activePlayer: 'p2' });
  if (reason === 'phase') useGameLoopStore.setState({ phase: 'setup' });
  const before = {
    units: units().units,
    sites: sites().sites,
    resources: economy().resources,
    population: economy().populationCap,
  };
  expect(spawn(cmd)).toMatchObject({ ok: false, code: reason });
  expect(units().units).toBe(before.units);
  expect(sites().sites).toBe(before.sites);
  expect(economy().resources).toBe(before.resources);
  expect(economy().populationCap).toBe(before.population);
});

it('союзный разведчик не заменяет своего; сон и потраченные действия своего не мешают найму', () => {
  units().placeUnit(scout, 5, 7);
  units().spawnUnit('scout', 7, 8, 'p3', true);
  expect(spawn(command())).toMatchObject({ ok: false, code: 'scout' });
  units().placeUnit(scout, 7, 7);
  units().changeAttackPoints(scout);
  units().setRestMode(scout, 'sleep');
  expect(spawn(command()).ok).toBe(true);
  expect(units().units[scout].restMode).toBe('sleep');
});

it('все участники делят три найма, а скрытое изменение остаётся только в памяти до нового обзора', () => {
  useEconomyStore.setState(s => {
    s.resources.p1.gold = 1000;
  });
  const other = units().spawnUnit('scout', 8, 8, 'p2', true)!;
  expect(spawn(command()).ok).toBe(true);
  expect(getParticipantKnowledge('p2')!.sites.camp).toMatchObject({
    hiresLeft: 2,
  });
  expect(nextTurn('p1').ok).toBe(true);
  expect(spawn({ ...command('archer'), actor: 'p2', x: 9, y: 8 }).ok).toBe(
    true,
  );
  expect(getParticipantKnowledge('p1')!.sites.camp).toMatchObject({
    hiresLeft: 1,
  });
  units().placeUnit(other, 19, 18);
  units().placeUnit(units().getUnitAt(9, 8)!.id, 18, 18);
  useGameLoopStore.setState({ activePlayer: 'p1' });
  expect(spawn({ ...command(), x: 7, y: 8 }).ok).toBe(true);
  expect(camp()).toMatchObject({ hiresLeft: 0 });
  expect(getParticipantKnowledge('p2')!.sites.camp).toMatchObject({
    hiresLeft: 1,
  });
  useGameLoopStore.setState({ activePlayer: 'p2' });
  units().placeUnit(other, 8, 8);
  expect(getParticipantKnowledge('p2')!.sites.camp).toMatchObject({
    hiresLeft: 0,
  });
  expect(spawn({ ...command(), actor: 'p2', x: 8, y: 6 })).toMatchObject({
    ok: false,
    code: 'campEmpty',
  });
});

it('подсветка не выдаёт скрытого врага, а исполнение не накладывает юнитов', () => {
  const enemy = units().spawnUnit('scout', 9, 8, 'p2', true)!;
  units().resetUnitsForNewTurn('p2');
  expect(units().units[enemy].concealed).toBe(true);
  expect(getCampSpawnCells('p1', 'camp')).toContainEqual({ x: 9, y: 8 });
  expect(spawn({ ...command(), y: 8 })).toMatchObject({
    ok: false,
    code: 'occupied',
  });
  expect(units().units[enemy].concealed).toBe(true);
  expect(camp()).toMatchObject({ hiresLeft: 3 });
});
it('разрешает холм и не позволяет тратить зарезервированное золото', () => {
  useMapStore.setState(s => {
    s.grid[7][9].type = 'hill';
  });
  const worker = units().spawnUnit('worker', 3, 3, 'p1', true)!;
  units().setOrder(worker, { type: 'build', buildingType: 'farm', x: 4, y: 3 });
  useEconomyStore.setState(s => {
    s.resources.p1 = { gold: 293, wood: 160 };
  });
  expect(spawn(command())).toMatchObject({ ok: false, code: 'resources' });
  useEconomyStore.setState(s => {
    s.resources.p1.gold = 294;
  });
  expect(spawn(command())).toEqual({ ok: true });
  expect(economy().resources.p1).toEqual({ gold: 60, wood: 160 });
});

it('скрытый запас не раскрывается отказом команды даже у разведчика без обзора', () => {
  useUnitsStore.setState(s => {
    s.units[scout].sightRange = 0;
  });
  sites().consumeCampHire('camp');
  sites().consumeCampHire('camp');
  sites().consumeCampHire('camp');
  expect(spawn(command())).toMatchObject({ ok: false, code: 'hidden' });
});
