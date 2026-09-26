import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useJournalStore } from '@entities/journals';
import { move } from '@features/pathfinding';
import { spawn } from '@features/spawn';
import { attack } from '@features/combat';
import { initGameLoopEvents, nextTurn, surrender } from '@features/game-loop';
import { initJournalSystem, initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const economy = () => useEconomyStore.getState();
const loop = () => useGameLoopStore.getState();
const journalTypes = () =>
  useJournalStore.getState().entries.map(({ type }) => type);

/** Ссылки на состояние: Immer сохраняет их, если ничего не изменилось. */
const snapshot = () => ({
  units: units().units,
  buildings: buildings().buildings,
  resources: economy().resources,
  loop: loop(),
});

const THREE = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
] as const;

let ownBase = '';
let enemyBase = '';
const hireWorker = () =>
  ({
    actor: 'p1',
    buildingId: ownBase,
    unitType: 'worker',
    x: 1,
    y: 0,
  }) as const;

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
  initJournalSystem();
  ownBase = buildings().spawnBuilding('base', 0, 0, 'p1')!;
  enemyBase = buildings().spawnBuilding('base', 6, 6, 'p2')!;
  buildings().resetBuildingsForNewTurn('p1');
});

describe('damage down to exactly zero HP', () => {
  it('removes a worker and frees its population', () => {
    const worker = units().spawnUnit('worker', 4, 4, 'p2')!;
    const archer = units().spawnUnit('archer', 4, 2, 'p1')!;
    units().resetUnitsForNewTurn('p1');
    units().damageUnit(worker, 3); // 25 − 3 = 22 = урон лучника
    expect(economy().populationCap.p2.occupied).toBe(1);
    attack({ actor: 'p1', attackerId: archer, targetId: worker });
    expect(units().units[worker]).toBeUndefined();
    expect(economy().populationCap.p2.occupied).toBe(0);
  });

  it('wins on the last hit to the town hall and rejects everything afterwards', () => {
    const soldier = units().spawnUnit('swordsman', 6, 5, 'p1')!;
    const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;
    units().resetUnitsForNewTurn('p1');
    buildings().damageBuilding(enemyBase, 682); // 700 − 682 = 18 = урон мечника
    expect(
      attack({ actor: 'p1', attackerId: soldier, targetId: enemyBase }),
    ).toMatchObject({ ok: true });
    expect(loop()).toMatchObject({ phase: 'gameOver', winner: 'p1' });
    expect(journalTypes()).toEqual([
      'buildingDestroyed',
      'eliminated',
      'gameOver',
      'attack',
    ]);
    const before = snapshot();
    const results = [
      move({ actor: 'p1', unitId: worker, x: 3, y: 2 }),
      spawn(hireWorker()),
      nextTurn('p1'),
      surrender('p1'),
    ];
    loop().startGame();
    for (const result of results) {
      expect(result).toMatchObject({ ok: false, code: 'phase' });
    }
    expect(snapshot()).toEqual(before);
  });

  it('loses when the enemy destroys the human town hall', () => {
    useGameLoopStore.setState({ activePlayer: 'p2' });
    const soldier = units().spawnUnit('swordsman', 1, 0, 'p2')!;
    units().resetUnitsForNewTurn('p2');
    buildings().damageBuilding(ownBase, 682);
    attack({ actor: 'p2', attackerId: soldier, targetId: ownBase });
    expect(loop()).toMatchObject({ phase: 'gameOver', winner: 'p2' });
  });
});

describe('turns and surrender', () => {
  it('ignores a repeated end of the same turn', () => {
    expect(nextTurn('p1')).toMatchObject({ ok: true });
    expect(nextTurn('p1')).toMatchObject({ ok: false, code: 'turn' });
    expect(economy().resources.p1.gold).toBe(203);
    expect(loop()).toMatchObject({ activePlayer: 'p2', currentTurn: 1 });
  });

  it('does not restart a running game', () => {
    useGameLoopStore.setState({ currentTurn: 5, activePlayer: 'p2' });
    loop().startGame();
    expect(loop()).toMatchObject({ currentTurn: 5, activePlayer: 'p2' });
  });

  it('ends a duel with surrender even during the enemy turn', () => {
    useGameLoopStore.setState({ activePlayer: 'p2' });
    units().spawnUnit('worker', 1, 1, 'p1');
    expect(surrender('p1')).toMatchObject({ ok: true });
    expect(loop()).toMatchObject({
      phase: 'gameOver',
      winner: 'p2',
      eliminated: ['p1'],
    });
    expect(Object.values(units().units)).toEqual([]);
    expect(buildings().buildings[ownBase]).toBeUndefined();
    expect(journalTypes()).toEqual(['eliminated', 'gameOver', 'surrender']);
  });

  it('removes one of three sides without ending the match and only once', () => {
    useGameLoopStore.setState({ participants: [...THREE] });
    buildings().spawnBuilding('base', 0, 6, 'p3');
    expect(surrender('p3')).toMatchObject({ ok: true });
    expect(surrender('p3')).toMatchObject({ ok: false, code: 'notFound' });
    expect(loop()).toMatchObject({
      phase: 'inProgress',
      activePlayer: 'p1',
      eliminated: ['p3'],
    });
    expect(buildings().getProductionBuildings('p3')).toEqual([]);
    expect(journalTypes()).toEqual(['eliminated', 'surrender']);
  });

  it('refuses a participant outside the match and keeps the turn of the entry', () => {
    expect(surrender('p3')).toMatchObject({ ok: false, code: 'notFound' });
    expect(journalTypes()).toEqual([]);
    useGameLoopStore.setState({ participants: [...THREE], activePlayer: 'p3' });
    surrender('p3'); // ход переходит к p1 и завершает круг
    expect(loop().currentTurn).toBe(2);
    const turns = useJournalStore.getState().entries.map(({ turn }) => turn);
    expect(turns).toEqual([1, 1]);
  });
});

describe('population loss', () => {
  it('keeps the army after a farm is destroyed but forbids hiring above the cap', () => {
    const farm = buildings().spawnBuilding('farm', 3, 3, 'p1')!;
    const { max } = economy().populationCap.p1;
    const archer = units().spawnUnit('archer', 2, 2, 'p1')!;
    economy().addUnit('p1', max - 3); // занято max − 1: рабочий ещё помещается
    buildings().damageBuilding(farm, 70);
    expect(units().units[archer]).toBeDefined();
    expect(economy().populationCap.p1.max).toBeLessThan(max);
    expect(spawn(hireWorker())).toMatchObject({
      ok: false,
      code: 'population',
    });
  });
});
