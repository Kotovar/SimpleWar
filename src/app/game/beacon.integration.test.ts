import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant } from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { getParticipantKnowledge } from '@entities/perceptions';
import { lightBeacon, getBeaconCells, build } from '@features/build';
import { nextTurn, resetGame } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { attack } from '@features/combat';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 2 },
  { id: 'p3', controller: 'ai', team: 1 },
];
let scout: string;
const target = { x: 8, y: 7 };
const command = () => ({ actor: 'p1' as const, unitId: scout, ...target });
const beacons = () =>
  Object.values(useBuildingsStore.getState().buildings).filter(
    b => b.type === 'beacon',
  );
const round = () => {
  for (const p of participants) expect(nextTurn(p.id).ok).toBe(true);
};
beforeEach(() => {
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
    currentTurn: 3,
    eliminated: [],
  });
  useEconomyStore.setState({
    resources: {
      ...useEconomyStore.getState().resources,
      p1: { gold: 0, wood: 30 },
      p2: { gold: 100, wood: 100 },
      p3: { gold: 100, wood: 100 },
    },
  });
  scout = useUnitsStore.getState().spawnUnit('scout', 7, 7, 'p1', true)!;
  useUnitsStore.getState().resetUnitsForNewTurn('p1');
});
afterEach(resetGame);

it('разжигает костёр за 30 дерева и действие, снимает маскировку и даёт союзникам обзор', () => {
  expect(
    getBeaconCells('p1', useUnitsStore.getState().units[scout]),
  ).toContainEqual(target);
  expect(lightBeacon(command()).ok).toBe(true);
  expect(beacons()).toHaveLength(1);
  expect(beacons()[0]).toMatchObject({
    owner: 'p1',
    hp: 20,
    sightRange: 5,
    expiresTurn: 9,
    ...target,
  });
  expect(useEconomyStore.getState().resources.p1).toEqual({ gold: 0, wood: 0 });
  expect(useUnitsStore.getState().units[scout]).toMatchObject({
    attackPoints: 0,
    movePoints: 0,
    scoutActed: true,
  });
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
  useUnitsStore.getState().placeUnit(scout, 1, 1);
  for (const observer of ['p1', 'p3'] as const) {
    const knowledge = getParticipantKnowledge(observer)!;
    expect(knowledge.visible[7 * 22 + 13]).toBe(1);
    expect(knowledge.visible[7 * 22 + 14]).toBe(0);
  }
});

it.each([
  'notFound',
  'resources',
  'points',
  'owner',
  'actionType',
  'distance',
  'bounds',
  'terrain',
  'occupied',
  'turn',
  'phase',
] as const)('отклоняет %s без цены, действия и нового костра', reason => {
  const cmd = command();
  if (reason === 'notFound') cmd.unitId = 'missing';
  if (reason === 'resources')
    useEconomyStore.setState({
      resources: {
        ...useEconomyStore.getState().resources,
        p1: { gold: 0, wood: 29 },
      },
    });
  if (reason === 'points') useUnitsStore.getState().changeAttackPoints(scout);
  if (reason === 'owner')
    useUnitsStore.setState(s => {
      s.units[scout].owner = 'p2';
    });
  if (reason === 'actionType')
    cmd.unitId = useUnitsStore
      .getState()
      .spawnUnit('swordsman', 7, 7, 'p1', true)!;
  if (reason === 'distance') cmd.x = 10;
  if (reason === 'bounds') cmd.x = -1;
  if (reason === 'terrain')
    useMapStore.setState(s => {
      s.grid[7][8].type = 'water';
      s.grid[7][8].isWalkable = false;
    });
  if (reason === 'occupied')
    useUnitsStore.getState().spawnUnit('worker', 8, 7, 'p1', true);
  if (reason === 'turn') useGameLoopStore.setState({ activePlayer: 'p2' });
  if (reason === 'phase') useGameLoopStore.setState({ phase: 'setup' });
  const units = useUnitsStore.getState().units;
  const resources = useEconomyStore.getState().resources;
  expect(lightBeacon(cmd)).toMatchObject({ ok: false, code: reason });
  expect(beacons()).toHaveLength(0);
  expect(useUnitsStore.getState().units).toBe(units);
  expect(useEconomyStore.getState().resources).toBe(resources);
});

it('горит шесть кругов, гаснет в начале хода владельца и оставляет память местности', () => {
  expect(lightBeacon(command()).ok).toBe(true);
  useUnitsStore.getState().placeUnit(scout, 1, 1);
  for (let i = 0; i < 5; i++) {
    round();
    expect(beacons()).toHaveLength(1);
  }
  expect(nextTurn('p1').ok).toBe(true);
  expect(beacons()).toHaveLength(1);
  expect(nextTurn('p2').ok).toBe(true);
  expect(beacons()).toHaveLength(1);
  expect(nextTurn('p3').ok).toBe(true);
  expect(beacons()).toHaveLength(0);
  expect(getParticipantKnowledge('p1')!.visible[7 * 22 + 13]).toBe(0);
  expect(getParticipantKnowledge('p1')!.terrain[7 * 22 + 13]).toBeGreaterThan(
    0,
  );
});

it('противник видит, запоминает и может уничтожить костёр обычной атакой', () => {
  expect(lightBeacon(command()).ok).toBe(true);
  const id = beacons()[0].id;
  const enemy = useUnitsStore
    .getState()
    .spawnUnit('swordsman', 9, 7, 'p2', true)!;
  expect(getObservation('p2').visibleEnemies.some(e => e.id === id)).toBe(true);
  expect(nextTurn('p1').ok).toBe(true);
  expect(attack({ actor: 'p2', attackerId: enemy, targetId: id }).ok).toBe(
    true,
  );
  expect(beacons()).toHaveLength(0);
});

it('рабочий не строит костёр обычной командой', () => {
  const worker = useUnitsStore
    .getState()
    .spawnUnit('worker', 7, 6, 'p1', true)!;
  expect(
    build({ actor: 'p1', workerId: worker, buildingType: 'beacon', ...target }),
  ).toMatchObject({ ok: false, code: 'actionType' });
});

it('подсветка не выдаёт скрытого разведчика по диагонали, команда не допускает наложения', () => {
  const enemy = useUnitsStore.getState().spawnUnit('scout', 8, 8, 'p2', true)!;
  useUnitsStore.getState().resetUnitsForNewTurn('p2');
  expect(useUnitsStore.getState().units[enemy].concealed).toBe(true);
  expect(
    getBeaconCells('p1', useUnitsStore.getState().units[scout]),
  ).toContainEqual({ x: 8, y: 8 });
  expect(lightBeacon({ ...command(), y: 8 })).toMatchObject({
    ok: false,
    code: 'occupied',
  });
  expect(beacons()).toHaveLength(0);
  expect(useUnitsStore.getState().units[enemy].concealed).toBe(true);
});

it('костёр второго участника гаснет в его ход, а не при смене номера круга', () => {
  useUnitsStore.getState().placeUnit(scout, 1, 1);
  const other = useUnitsStore.getState().spawnUnit('scout', 7, 7, 'p2', true)!;
  useUnitsStore.getState().resetUnitsForNewTurn('p2');
  useGameLoopStore.setState({ activePlayer: 'p2' });
  expect(lightBeacon({ actor: 'p2', unitId: other, ...target }).ok).toBe(true);
  for (let i = 0; i < 5; i++)
    for (const actor of ['p2', 'p3', 'p1'] as const)
      expect(nextTurn(actor).ok).toBe(true);
  expect(nextTurn('p2').ok).toBe(true);
  expect(nextTurn('p3').ok).toBe(true);
  expect(useGameLoopStore.getState().currentTurn).toBe(9);
  expect(beacons()).toHaveLength(1);
  expect(nextTurn('p1').ok).toBe(true);
  expect(beacons()).toHaveLength(0);
});
