import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { executeOrders } from '@features/pathfinding';
import { initVisibilitySystem } from '@features/visibility';
import { buildRoad } from '@features/workers';
import { orderRoad } from './workerOrders';

const units = () => useUnitsStore.getState();
const wood = () => useEconomyStore.getState().resources.p1.wood;
const roads = () =>
  useMapStore
    .getState()
    .grid[0].filter(cell => cell.road)
    .map(({ x }) => x);

/** Следующий свой ход: очки восстановлены, приказы исполняются. */
const nextTurn = () => {
  units().resetUnitsForNewTurn('p1');
  return executeOrders('p1', (unit, cell) =>
    unit.order.type === 'road' && cell
      ? buildRoad({ actor: 'p1', workerId: unit.id, ...cell, byOrder: true })
      : reject('target'),
  );
};

let workerId: string;

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useJournalStore.getState().newGame();
  useEconomyStore.getState().resetStore();
  useKnowledgeStore.setState({ byParticipant: {} });
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = [
    Array.from({ length: 12 }, (_, x) => ({
      x,
      y: 0,
      type: 'grass' as const,
      isWalkable: true,
    })),
  ];
  useMapStore.setState({ grid });
  initVisibilitySystem();
  workerId = units().spawnUnit('worker', 0, 0, 'p1')!;
  units().resetUnitsForNewTurn('p1');
});

describe('приказ «Проложить дорогу до…»', () => {
  it('кладёт по клетке за ход, идя по своей дороге, и снимается на цели', () => {
    expect(orderRoad({ actor: 'p1', workerId, x: 5, y: 0 })).toEqual(ok);
    expect(roads()).toEqual([1]);
    expect(units().units[workerId]).toMatchObject({
      x: 0,
      movePoints: 0,
      order: { type: 'road', x: 5 },
    });

    for (let turn = 2; turn <= 5; turn++) expect(nextTurn()).toEqual([]);

    expect(roads()).toEqual([1, 2, 3, 4, 5]);
    // Рабочий стоит у последней клетки, приказ снят; клетка старта без дороги.
    expect(units().units[workerId]).toMatchObject({ x: 4 });
    expect(units().units[workerId].order).toBeUndefined();
    expect(wood()).toBe(120 - 50);
  });

  it('без очков движения ждёт, а не останавливается', () => {
    orderRoad({ actor: 'p1', workerId, x: 5, y: 0 });
    // Повторное исполнение в тот же ход (завершение хода): очков нет.
    expect(
      executeOrders('p1', (unit, cell) =>
        buildRoad({ actor: 'p1', workerId: unit.id, ...cell!, byOrder: true }),
      ),
    ).toEqual([]);
    expect(units().units[workerId].order).toMatchObject({ type: 'road' });
    expect(units().units[workerId].order?.stopped).toBeUndefined();
  });

  it('без дерева останавливается с причиной', () => {
    orderRoad({ actor: 'p1', workerId, x: 5, y: 0 });
    useEconomyStore.getState().removeResources('p1', { wood: wood() - 5 });

    expect(nextTurn()).toEqual([workerId]);
    expect(units().units[workerId].order).toMatchObject({
      stopped: 'resources',
    });
    expect(roads()).toEqual([1]);
  });

  it('отказывает не рабочему и без пути', () => {
    const scout = units().spawnUnit('scout', 3, 0, 'p1')!;
    expect(
      orderRoad({ actor: 'p1', workerId: scout, x: 5, y: 0 }),
    ).toMatchObject({ code: 'actionType' });
    useMapStore.getState().setCell(2, 0, { type: 'water', isWalkable: false });
    expect(orderRoad({ actor: 'p1', workerId, x: 8, y: 0 })).toMatchObject({
      code: 'path',
    });
    expect(units().units[workerId].order).toBeUndefined();
  });
});
