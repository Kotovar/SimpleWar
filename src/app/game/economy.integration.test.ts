import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, REPAIR, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useJournalStore } from '@entities/journals';
import { move } from '@features/pathfinding';
import { build, demolish } from '@features/build';
import { initGameLoopEvents, nextTurn } from '@features/game-loop';
import {
  assignWorker,
  clearForest,
  repair,
  unassignWorker,
} from '@features/workers';
import { initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const economy = () => useEconomyStore.getState();
const gold = () => economy().resources.p1.gold;
const wood = () => economy().resources.p1.wood;
const worker = (id: string) => {
  const unit = units().units[id];
  if (unit?.role !== 'civil') throw new Error('нет рабочего ' + id);
  return unit;
};

/** Полный круг: p1 завершает ход, p2 сразу отвечает тем же. */
const round = () => {
  nextTurn('p1');
  nextTurn('p2');
};

let mine = '';

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
    Array.from({ length: 9 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  grid[3][4] = { x: 4, y: 3, type: 'gold', isWalkable: false };
  grid[0][8] = { x: 8, y: 0, type: 'forest', isWalkable: false };
  useMapStore.setState({ grid });
  initPopulationSystem();
  initGameLoopEvents();
  buildings().spawnBuilding('base', 0, 0, 'p1');
  buildings().spawnBuilding('base', 8, 6, 'p2');
  mine = buildings().spawnBuilding('mine', 4, 3, 'p1')!;
});

const readyWorker = (x: number, y: number) =>
  units().spawnUnit('worker', x, y, 'p1', true)!;

describe('назначение рабочих', () => {
  it('обслуживаемый рудник даёт 15 золота, праздный — ничего', () => {
    const miner = readyWorker(3, 3);
    round();
    expect(gold()).toBe(200 + 3);

    expect(
      assignWorker({ actor: 'p1', workerId: miner, buildingId: mine }),
    ).toEqual({ ok: true });
    round();
    expect(gold()).toBe(200 + 3 + 3 + 15);
    // Назначение сохраняется между ходами.
    round();
    expect(gold()).toBe(200 + 3 + 3 + 15 + 3 + 15);
  });

  it('второй рабочий не займёт то же место', () => {
    const first = readyWorker(3, 3);
    const second = readyWorker(5, 3);
    assignWorker({ actor: 'p1', workerId: first, buildingId: mine });

    expect(
      assignWorker({ actor: 'p1', workerId: second, buildingId: mine }),
    ).toMatchObject({ ok: false, code: 'workplace' });
    round();
    expect(gold()).toBe(200 + 3 + 15);
  });

  it('отклоняет дальнего рабочего, чужое здание и не ресурсное', () => {
    const far = readyWorker(1, 5);
    const near = readyWorker(3, 3);
    const enemyMine = buildings().spawnBuilding('mine', 2, 2, 'p2')!;
    const farm = buildings().spawnBuilding('farm', 3, 4, 'p1')!;

    expect(
      assignWorker({ actor: 'p1', workerId: far, buildingId: mine }),
    ).toMatchObject({ code: 'distance' });
    expect(
      assignWorker({ actor: 'p1', workerId: near, buildingId: enemyMine }),
    ).toMatchObject({ code: 'owner' });
    expect(
      assignWorker({ actor: 'p1', workerId: near, buildingId: farm }),
    ).toMatchObject({ code: 'target' });
  });

  it('движение и снятие разрывают назначение, повторное снятие — отказ', () => {
    const miner = readyWorker(3, 3);
    assignWorker({ actor: 'p1', workerId: miner, buildingId: mine });
    expect(unassignWorker({ actor: 'p1', workerId: miner }).ok).toBe(true);
    expect(unassignWorker({ actor: 'p1', workerId: miner })).toMatchObject({
      code: 'target',
    });

    assignWorker({ actor: 'p1', workerId: miner, buildingId: mine });
    move({ actor: 'p1', unitId: miner, x: 3, y: 2 });
    expect(worker(miner).workplaceId).toBeNull();
  });

  it('стройка снимает назначение, и в этот ход добычи нет', () => {
    const miner = readyWorker(3, 3);
    economy().addResources('p1', { wood: 200 });
    assignWorker({ actor: 'p1', workerId: miner, buildingId: mine });
    build({
      actor: 'p1',
      workerId: miner,
      buildingType: 'farm',
      x: 2,
      y: 3,
    });

    expect(worker(miner).workplaceId).toBeNull();
    const before = gold();
    nextTurn('p1');
    expect(gold()).toBe(before + 3);
  });

  it('гибель рабочего или здания разрывает связь', () => {
    const miner = readyWorker(3, 3);
    assignWorker({ actor: 'p1', workerId: miner, buildingId: mine });
    buildings().damageBuilding(mine, 10_000);
    expect(worker(miner).workplaceId).toBeNull();

    const other = buildings().spawnBuilding('mine', 4, 3, 'p1')!;
    assignWorker({ actor: 'p1', workerId: miner, buildingId: other });
    units().damageUnit(miner, 10_000);
    round();
    expect(gold()).toBe(200 + 3);
  });

  it('добыча тратит рабочее действие в конце своего хода', () => {
    const miner = readyWorker(3, 3);
    assignWorker({ actor: 'p1', workerId: miner, buildingId: mine });
    nextTurn('p1');
    expect(worker(miner).buildPoints).toBe(0);
  });

  it('без рабочих ратуша продолжает платить золото и дерево', () => {
    round();
    round();
    expect(economy().resources.p1).toEqual({
      gold: 200 + 6,
      wood: 120 + 4,
    });
  });
});

describe('ремонт', () => {
  it('восстанавливает не выше максимума и тратит действие и цену', () => {
    const repairer = readyWorker(5, 3);
    buildings().damageBuilding(mine, 10);

    expect(
      repair({ actor: 'p1', workerId: repairer, buildingId: mine }),
    ).toEqual({ ok: true });
    expect(buildings().buildings[mine].hp).toBe(
      buildings().buildings[mine].maxHp,
    );
    expect(gold()).toBe(200 - REPAIR.cost.gold);
    expect(wood()).toBe(120 - REPAIR.cost.wood);
    expect(worker(repairer)).toMatchObject({ buildPoints: 0, movePoints: 0 });
  });

  it('отклоняет целое здание и ремонт без денег, ничего не списывая', () => {
    const repairer = readyWorker(5, 3);
    expect(
      repair({ actor: 'p1', workerId: repairer, buildingId: mine }),
    ).toMatchObject({ code: 'target' });

    buildings().damageBuilding(mine, 100);
    economy().removeResources('p1', { wood: 120 });
    const hp = buildings().buildings[mine].hp;
    expect(
      repair({ actor: 'p1', workerId: repairer, buildingId: mine }),
    ).toMatchObject({ code: 'resources' });
    expect(buildings().buildings[mine].hp).toBe(hp);
    expect(worker(repairer).buildPoints).toBe(1);
  });
});

describe('расчистка леса', () => {
  it('делает клетку полем без выдачи дерева; повтор — отказ', () => {
    const cutter = readyWorker(7, 0);

    expect(clearForest({ actor: 'p1', workerId: cutter, x: 8, y: 0 })).toEqual({
      ok: true,
    });
    expect(useMapStore.getState().grid[0][8]).toMatchObject({
      type: 'grass',
      isWalkable: true,
    });
    expect(wood()).toBe(120);
    expect(worker(cutter)).toMatchObject({ buildPoints: 0, movePoints: 0 });

    expect(
      clearForest({ actor: 'p1', workerId: cutter, x: 8, y: 0 }),
    ).toMatchObject({ ok: false, code: 'terrain' });
  });

  it('не расчищает клетку с лесопилкой, скрытую и без очка стройки', () => {
    const cutter = readyWorker(7, 0);
    economy().addResources('p1', { wood: 200 });
    buildings().spawnBuilding('sawmill', 8, 0, 'p1');
    expect(
      clearForest({ actor: 'p1', workerId: cutter, x: 8, y: 0 }),
    ).toMatchObject({ code: 'occupied' });

    // Вне обзора всех своих объектов клетка скрыта: местность не раскрывается.
    useMapStore.getState().setCell(8, 5, { type: 'forest', isWalkable: false });
    useUnitsStore.setState({ units: {} });
    const lone = readyWorker(1, 1);
    expect(
      clearForest({ actor: 'p1', workerId: lone, x: 8, y: 5 }),
    ).toMatchObject({ code: 'hidden' });
  });

  it('открывает проход для движения', () => {
    const cutter = readyWorker(7, 0);
    clearForest({ actor: 'p1', workerId: cutter, x: 8, y: 0 });
    units().resetUnitsForNewTurn('p1');
    expect(move({ actor: 'p1', unitId: cutter, x: 8, y: 0 }).ok).toBe(true);
  });
});

describe('снос и последний проход', () => {
  it('сносит своё здание без возврата ресурсов, ратушу — нет', () => {
    const miner = readyWorker(3, 3);
    assignWorker({ actor: 'p1', workerId: miner, buildingId: mine });
    const before = economy().resources.p1;

    expect(demolish({ actor: 'p1', buildingId: mine })).toEqual({ ok: true });
    expect(buildings().buildings[mine]).toBeUndefined();
    expect(worker(miner).workplaceId).toBeNull();
    expect(economy().resources.p1).toEqual(before);

    const base = buildings().getProductionBuildings('p1')[0];
    expect(demolish({ actor: 'p1', buildingId: base.id })).toMatchObject({
      code: 'target',
    });
  });

  it('снос фермы пересчитывает население', () => {
    economy().addResources('p1', { wood: 200 });
    const farm = buildings().spawnBuilding('farm', 2, 5, 'p1')!;
    const max = economy().populationCap.p1.max;
    demolish({ actor: 'p1', buildingId: farm });
    expect(economy().populationCap.p1.max).toBeLessThan(max);
  });

  it('не даёт замуровать ратушу последней постройкой', () => {
    // Коридор: ратуша в (0, 0), выход только через (1, 0).
    const grid = useMapStore
      .getState()
      .grid.map(row => row.map(cell => ({ ...cell })));
    for (const [x, y] of [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 0],
    ]) {
      grid[y][x] = { x, y, type: 'water', isWalkable: false };
    }
    grid[0][2] = { x: 2, y: 0, type: 'grass', isWalkable: true };
    grid[1][2] = { x: 2, y: 1, type: 'grass', isWalkable: true };
    useMapStore.setState({ grid });
    economy().addResources('p1', { wood: 200 });
    const builder = readyWorker(2, 0);

    expect(
      build({
        actor: 'p1',
        workerId: builder,
        buildingType: 'farm',
        x: 1,
        y: 0,
      }),
    ).toMatchObject({ ok: false, code: 'blocked' });
    expect(buildings().getBuildingAt(1, 0)).toBeNull();
  });
});
