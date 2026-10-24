import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSitesStore } from '@entities/sites';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { getParticipantKnowledge } from '@entities/perceptions';
import {
  occupyRuins,
  getOutpostCells,
  build,
  demolish,
  getPlacementRejection,
} from '@features/build';
import { attack, prepareStrike } from '@features/combat';
import {
  initGameLoopEvents,
  nextTurn,
  resetGame,
  surrender,
} from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initPopulationSystem } from '@app/system';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 2 },
  { id: 'p3', controller: 'ai', team: 1 },
];
const target = { x: 8, y: 7 };
let unitId: string;
const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const sites = () => useSitesStore.getState();
const command = () => ({ actor: 'p1' as const, unitId, ...target });
const capture = () => {
  expect(occupyRuins(command())).toEqual({ ok: true });
  return buildings().getBuildingAt(8, 7)!;
};
beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
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
  buildings().spawnBuilding('base', 1, 1, 'p1');
  buildings().spawnBuilding('base', 20, 20, 'p2');
  buildings().spawnBuilding('base', 1, 20, 'p3');
  sites().setSites([{ id: 'ruins', type: 'ruins', ...target }]);
  unitId = units().spawnUnit('scout', 7, 7, 'p1', true)!;
  units().resetUnitsForNewTurn('p1');
});
afterEach(resetGame);

it('занимает руины за действие без ресурсов: HP, доход, население, общий обзор', () => {
  const resources = useEconomyStore.getState().resources;
  expect(getOutpostCells('p1', units().units[unitId])).toEqual([target]);
  const outpost = capture();
  expect(outpost).toMatchObject({
    type: 'outpost',
    role: 'supply',
    owner: 'p1',
    hp: 120,
    sightRange: 4,
    income: { gold: 5 },
    populationSupply: 2,
  });
  expect(sites().getSiteAt(8, 7)).toBeNull();
  expect(units().units[unitId]).toMatchObject({
    attackPoints: 0,
    movePoints: 0,
    scoutActed: true,
  });
  expect(units().units[unitId].concealed).toBeUndefined();
  expect(useEconomyStore.getState().resources).toBe(resources);
  expect(useEconomyStore.getState().populationCap.p1.max).toBe(12);
  expect(useEconomyStore.getState().populationCap.p3.max).toBe(10);
  units().placeUnit(unitId, 1, 2);
  for (const owner of ['p1', 'p3'] as const)
    expect(getParticipantKnowledge(owner)!.visible[7 * 22 + 12]).toBe(1);
  const gold = useEconomyStore.getState().resources.p1.gold;
  expect(nextTurn('p1').ok).toBe(true);
  expect(useEconomyStore.getState().resources.p1.gold).toBe(gold + 8);
});

it.each([
  'notFound',
  'owner',
  'actionType',
  'points',
  'bounds',
  'distance',
  'target',
  'occupied',
  'turn',
  'phase',
] as const)('отказ %s не изменяет мир и очки', reason => {
  const cmd = command();
  if (reason === 'notFound') cmd.unitId = 'missing';
  if (reason === 'owner')
    useUnitsStore.setState(s => {
      s.units[unitId].owner = 'p2';
    });
  if (reason === 'actionType')
    cmd.unitId = units().spawnUnit('worker', 7, 8, 'p1', true)!;
  if (reason === 'points') units().changeAttackPoints(unitId);
  if (reason === 'bounds') cmd.x = -1;
  if (reason === 'distance') cmd.x = 12;
  if (reason === 'target') sites().removeSite('ruins');
  if (reason === 'occupied') units().spawnUnit('worker', 8, 7, 'p1', true);
  if (reason === 'turn') useGameLoopStore.setState({ activePlayer: 'p2' });
  if (reason === 'phase') useGameLoopStore.setState({ phase: 'setup' });
  const before = {
    units: units().units,
    buildings: buildings().buildings,
    sites: sites().sites,
    resources: useEconomyStore.getState().resources,
  };
  expect(occupyRuins(cmd)).toMatchObject({ ok: false, code: reason });
  expect(units().units).toBe(before.units);
  expect(buildings().buildings).toBe(before.buildings);
  expect(sites().sites).toBe(before.sites);
  expect(useEconomyStore.getState().resources).toBe(before.resources);
});

it('союзник не забирает живой аванпост; после разрушения враг может занять руины', () => {
  const outpost = capture();
  const ally = units().spawnUnit('swordsman', 8, 8, 'p3', true)!;
  units().resetUnitsForNewTurn('p3');
  useGameLoopStore.setState({ activePlayer: 'p3' });
  expect(occupyRuins({ actor: 'p3', unitId: ally, ...target })).toMatchObject({
    ok: false,
    code: 'target',
  });
  const enemy = units().spawnUnit('swordsman', 9, 7, 'p2', true)!;
  units().resetUnitsForNewTurn('p2');
  useGameLoopStore.setState({ activePlayer: 'p2' });
  buildings().damageBuilding(outpost.id, 119);
  expect(
    attack({ actor: 'p2', attackerId: enemy, targetId: outpost.id }).ok,
  ).toBe(true);
  expect(sites().getSiteAt(8, 7)?.type).toBe('ruins');
  expect(useEconomyStore.getState().populationCap.p1.max).toBe(10);
  units().resetUnitsForNewTurn('p2');
  expect(occupyRuins({ actor: 'p2', unitId: enemy, ...target }).ok).toBe(true);
  expect(buildings().getBuildingAt(8, 7)?.owner).toBe('p2');
  expect(useEconomyStore.getState().populationCap.p2.max).toBe(12);
});

it('потеря ратуши завершает игру при живом аванпосте и возвращает его в руины', () => {
  capture();
  expect(surrender('p3').ok).toBe(true);
  const base = Object.values(buildings().buildings).find(
    b => b.type === 'base' && b.owner === 'p1',
  )!;
  const enemy = units().spawnUnit('swordsman', 2, 1, 'p2', true)!;
  units().resetUnitsForNewTurn('p2');
  buildings().damageBuilding(base.id, 699);
  useGameLoopStore.setState({ activePlayer: 'p2' });
  expect(attack({ actor: 'p2', attackerId: enemy, targetId: base.id }).ok).toBe(
    true,
  );
  expect(useGameLoopStore.getState().eliminated).toContain('p1');
  expect(useGameLoopStore.getState()).toMatchObject({
    phase: 'gameOver',
    winner: 'p2',
  });
  expect(Object.values(buildings().buildings).some(b => b.owner === 'p1')).toBe(
    false,
  );
  expect(sites().getSiteAt(8, 7)?.type).toBe('ruins');
});

it('снос и сдача возвращают руины, обычный рабочий аванпост не строит', () => {
  let outpost = capture();
  expect(demolish({ actor: 'p1', buildingId: outpost.id }).ok).toBe(true);
  expect(sites().getSiteAt(8, 7)?.type).toBe('ruins');
  units().resetUnitsForNewTurn('p1');
  outpost = capture();
  const worker = units().spawnUnit('worker', 8, 8, 'p1', true)!;
  expect(
    build({
      actor: 'p1',
      workerId: worker,
      buildingType: 'outpost',
      x: 9,
      y: 8,
    }),
  ).toMatchObject({ ok: false, code: 'actionType' });
  expect(surrender('p1').ok).toBe(true);
  expect(buildings().buildings[outpost.id]).toBeUndefined();
  expect(sites().getSiteAt(8, 7)?.type).toBe('ruins');
});

it('рабочий не строит на находке: руины не пропадают под зданием', () => {
  const worker = units().spawnUnit('worker', 8, 8, 'p1', true)!;
  units().resetUnitsForNewTurn('p1');
  expect(
    getPlacementRejection(units().units[worker], 'p1', 'farm', target),
  ).toBe('occupied');
  expect(
    build({ actor: 'p1', workerId: worker, buildingType: 'farm', ...target }),
  ).toMatchObject({ ok: false, code: 'occupied' });
  expect(buildings().getBuildingAt(8, 7)).toBeNull();
  expect(sites().getSiteAt(8, 7)?.type).toBe('ruins');
});

it('не раскрывает маскировку в подсветке руин и не допускает наложения', () => {
  sites().setSites([{ id: 'diagonal', type: 'ruins', x: 8, y: 8 }]);
  const hidden = units().spawnUnit('scout', 8, 8, 'p2', true)!;
  units().resetUnitsForNewTurn('p2');
  expect(units().units[hidden].concealed).toBe(true);
  expect(getOutpostCells('p1', units().units[unitId])).toEqual([
    { x: 8, y: 8 },
  ]);
  expect(occupyRuins({ ...command(), y: 8 })).toMatchObject({
    ok: false,
    code: 'occupied',
  });
  expect(units().units[hidden].concealed).toBe(true);
  expect(sites().getSiteAt(8, 8)?.type).toBe('ruins');
});
it('не захватывает невидимые руины и находки другого вида', () => {
  sites().setSites([
    { id: 'cache', type: 'cache', resource: 'gold', amount: 80, ...target },
  ]);
  expect(occupyRuins(command())).toMatchObject({ ok: false, code: 'target' });
  sites().setSites([{ id: 'ruins', type: 'ruins', ...target }]);
  useUnitsStore.setState(s => {
    s.units[unitId].sightRange = 0;
  });
  expect(getOutpostCells('p1', units().units[unitId])).toEqual([]);
  expect(occupyRuins(command())).toMatchObject({ ok: false, code: 'hidden' });
});
it('подготовленный удар осады тоже возвращает руины и снимает снабжение', () => {
  const outpost = capture();
  const siege = units().spawnUnit('siege', 8, 9, 'p2', true)!;
  units().resetUnitsForNewTurn('p2');
  useGameLoopStore.setState({ activePlayer: 'p2' });
  expect(prepareStrike({ actor: 'p2', unitId: siege, ...target })).toEqual({
    ok: true,
  });
  for (const owner of ['p2', 'p3', 'p1'] as const)
    expect(nextTurn(owner).ok).toBe(true);
  expect(buildings().buildings[outpost.id]).toBeUndefined();
  expect(sites().getSiteAt(8, 7)?.type).toBe('ruins');
  expect(useEconomyStore.getState().populationCap.p1.max).toBe(10);
});
