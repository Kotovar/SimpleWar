import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  BUILDINGS_CONFIG,
  DEFAULT_PARTICIPANTS,
  type Cell,
} from '@shared/config';
import { ok } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore, runCommand } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { useResearchStore } from '@entities/researches';
import {
  assignWorker,
  getContextWorkplace,
  giveWorkOrder,
} from '@features/workers';
import { runOrders } from './runOrders';
import { build, giveBuildOrder, getContextBuildings } from '@features/build';
import {
  advanceOrder,
  executeOrders,
  move,
  cancelOrder,
} from '@features/pathfinding';

const units = () => useUnitsStore.getState();
const target = { x: 10, y: 1 };
let workerId: string;
const arrival = (
  unit: Parameters<NonNullable<Parameters<typeof advanceOrder>[2]>>[0],
) =>
  unit.order.type === 'build'
    ? build({ actor: 'p1', workerId: unit.id, ...unit.order })
    : assignWorker({
        actor: 'p1',
        workerId: unit.id,
        buildingId: unit.order.buildingId,
      });
const order = () =>
  giveBuildOrder({ actor: 'p1', workerId, buildingType: 'mine', ...target });
const execute = () => executeOrders('p1', arrival);

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useJournalStore.getState().newGame();
  useEconomyStore.getState().resetStore();
  useDebugStore.getState().resetStore();
  useResearchStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = Array.from({ length: 3 }, (_, y) =>
    Array.from({ length: 12 }, (_, x) => ({
      x,
      y,
      type: x === 10 && y === 1 ? 'gold' : 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  const terrain = new Uint8Array(36).fill(1);
  terrain[22] = 7;
  useKnowledgeStore.setState({
    byParticipant: {
      p1: {
        width: 12,
        height: 3,
        terrain,
        visible: new Uint8Array(36),
        contacts: {},
        strikes: {},
      },
    },
  });
  workerId = units().spawnUnit('worker', 0, 1, 'p1')!;
  units().resetUnitsForNewTurn('p1');
  useEconomyStore.getState().addResources('p1', { gold: 1000, wood: 1000 });
});

describe('контекстная стройка', () => {
  it('идёт несколько ходов и строит рядом, списывая цену ровно один раз', () => {
    const stock = { ...useEconomyStore.getState().resources.p1 };
    expect(order()).toEqual(ok);
    expect(execute()).toEqual([]);
    expect(units().units[workerId]).toMatchObject({
      x: 4,
      movePoints: 0,
      order: { type: 'build', buildingType: 'mine' },
    });
    expect(execute()).toEqual([]);
    expect(units().units[workerId].x).toBe(4);
    expect(useEconomyStore.getState().resources.p1).toEqual(stock);
    for (let i = 0; i < 2; i++) {
      units().resetUnitsForNewTurn('p1');
      expect(execute()).toEqual([]);
    }
    expect(useBuildingsStore.getState().getBuildingAt(10, 1)?.type).toBe(
      'mine',
    );
    expect(units().units[workerId]).toMatchObject({ x: 9, buildPoints: 0 });
    expect(units().units[workerId].order).toBeUndefined();
    expect(useEconomyStore.getState().resources.p1).toEqual({
      gold: stock.gold - BUILDINGS_CONFIG.mine.cost.gold,
      wood: stock.wood - BUILDINGS_CONFIG.mine.cost.wood,
    });
    execute();
    expect(Object.values(useBuildingsStore.getState().buildings)).toHaveLength(
      1,
    );
  });
  it('ждёт рабочего действия после прибытия', () => {
    units().placeUnit(workerId, 9, 1);
    units().changeBuildPoints(workerId);
    expect(order()).toEqual(ok);
    execute();
    expect(units().units[workerId].order?.stopped).toBeUndefined();
    expect(useBuildingsStore.getState().getBuildingAt(10, 1)).toBeNull();
    units().resetUnitsForNewTurn('p1');
    execute();
    expect(useBuildingsStore.getState().getBuildingAt(10, 1)?.type).toBe(
      'mine',
    );
  });
  it.each(['resources', 'occupied', 'terrain'] as const)(
    'повторно проверяет %s по прибытии',
    reason => {
      expect(order()).toEqual(ok);
      units().placeUnit(workerId, 9, 1);
      if (reason === 'resources')
        useEconomyStore.setState({
          resources: {
            ...useEconomyStore.getState().resources,
            p1: { gold: 0, wood: 0 },
          },
        });
      if (reason === 'occupied') units().spawnUnit('worker', 10, 1, 'p1');
      if (reason === 'terrain')
        useMapStore.getState().setCell(10, 1, { type: 'grass' });
      expect(execute()).toEqual([workerId]);
      expect(units().units[workerId].order?.stopped).toBe(reason);
      expect(execute()).toEqual([]);
    },
  );
  it('прямая команда снимает стройку, отмена не расходует очки', () => {
    order();
    expect(cancelOrder({ actor: 'p1', unitId: workerId })).toEqual(ok);
    expect(units().units[workerId].movePoints).toBe(4);
    order();
    expect(move({ actor: 'p1', unitId: workerId, x: 1, y: 1 })).toEqual(ok);
    expect(units().units[workerId].order).toBeUndefined();
  });
  it('не раскрывает скрытую занятость или неизвестный ресурс меню', () => {
    expect(getContextBuildings(units().units[workerId], 'p1', target)).toEqual([
      'mine',
    ]);
    units().spawnUnit('swordsman', 10, 1, 'p2');
    expect(getContextBuildings(units().units[workerId], 'p1', target)).toEqual([
      'mine',
    ]);
    useKnowledgeStore.getState().resetStore();
    expect(getContextBuildings(units().units[workerId], 'p1', target)).toEqual(
      [],
    );
  });
  it('busy и чужой ход не меняют приказ', () => {
    order();
    const before = units().units[workerId];
    useGameLoopStore.setState({ activePlayer: 'p2' });
    execute();
    expect(units().units[workerId]).toEqual(before);
    useGameLoopStore.setState({ activePlayer: 'p1' });
    runCommand({ type: 'order', actor: 'p1', details: {} }, 1, () => {
      expect(execute()).toEqual([]);
      return ok;
    });
    expect(units().units[workerId]).toEqual(before);
  });
  it('нет доступного места рядом со стройкой — останавливается без расходов', () => {
    order();
    units().placeUnit(workerId, 8, 1);
    for (let y = 0; y < 3; y++)
      for (let x = 9; x < 12; x++) {
        if (x !== 10 || y !== 1)
          useMapStore
            .getState()
            .setCell(x, y, { type: 'water', isWalkable: false });
      }
    const stock = useEconomyStore.getState().resources.p1;
    expect(execute()).toEqual([workerId]);
    expect(units().units[workerId].order?.stopped).toBe('path');
    expect(useEconomyStore.getState().resources.p1).toEqual(stock);
  });
  it('новый враг останавливает стройку до прибытия', () => {
    order();
    units().spawnUnit('swordsman', 6, 1, 'p2');
    expect(execute()).toEqual([workerId]);
    expect(units().units[workerId].order?.stopped).toBe('enemy');
    expect(useBuildingsStore.getState().getBuildingAt(10, 1)).toBeNull();
  });
  it('поле не перехватывается меню; обычная стройка требует свободного соседа', () => {
    expect(
      getContextBuildings(units().units[workerId], 'p1', { x: 1, y: 1 }),
    ).toEqual([]);
    expect(
      build({ actor: 'p1', workerId, buildingType: 'farm', x: 2, y: 1 }),
    ).toMatchObject({ code: 'distance' });
    expect(
      build({ actor: 'p1', workerId, buildingType: 'farm', x: 1, y: 1 }),
    ).toEqual(ok);
  });
});

describe('контекстное назначение на работу', () => {
  it.each(['mine', 'sawmill'] as const)(
    'показывает свободному рабочему пустое своё здание %s и назначает рядом без рабочего действия',
    type => {
      const buildingId = useBuildingsStore
        .getState()
        .spawnBuilding(type, 10, 1, 'p1')!;
      units().placeUnit(workerId, 9, 1);
      units().changeBuildPoints(workerId);
      expect(
        getContextWorkplace(units().units[workerId], 'p1', target)?.id,
      ).toBe(buildingId);
      expect(giveWorkOrder({ actor: 'p1', workerId, buildingId })).toEqual(ok);
      expect(execute()).toEqual([]);
      expect(units().units[workerId]).toMatchObject({
        x: 10,
        y: 1,
        workplaceId: buildingId,
        buildPoints: 0,
      });
      expect(units().units[workerId].order).toBeUndefined();
      expect(
        getContextWorkplace(units().units[workerId], 'p1', target),
      ).toBeNull();
    },
  );
  it('дальний приказ идёт несколько ходов и назначается через общий запуск приказов', () => {
    const buildingId = useBuildingsStore
      .getState()
      .spawnBuilding('mine', 10, 1, 'p1')!;
    const stock = useEconomyStore.getState().resources.p1;
    giveWorkOrder({ actor: 'p1', workerId, buildingId });
    expect(runOrders('p1', () => {})).toBe(false);
    expect(units().units[workerId]).toMatchObject({
      x: 4,
      movePoints: 0,
      order: { type: 'work', buildingId },
    });
    runOrders('p1', () => {});
    expect(units().units[workerId].x).toBe(4);
    for (let i = 0; i < 2; i++) {
      units().resetUnitsForNewTurn('p1');
      runOrders('p1', () => {});
    }
    expect(units().units[workerId]).toMatchObject({
      x: 10,
      y: 1,
      workplaceId: buildingId,
    });
    expect(units().units[workerId].order).toBeUndefined();
    expect(useEconomyStore.getState().resources.p1).toEqual(stock);
  });
  it('занятое место скрывает кнопку и останавливает ранее поставленный приказ', () => {
    const buildingId = useBuildingsStore
      .getState()
      .spawnBuilding('mine', 10, 1, 'p1')!;
    giveWorkOrder({ actor: 'p1', workerId, buildingId });
    const holder = units().spawnUnit('worker', 10, 1, 'p1')!;
    units().setWorkplace(holder, buildingId);
    expect(
      getContextWorkplace(units().units[workerId], 'p1', target),
    ).toBeNull();
    units().placeUnit(workerId, 9, 1);
    expect(runOrders('p1', () => {})).toBe(true);
    expect(units().units[workerId]).toMatchObject({
      x: 9,
      order: { stopped: 'workplace' },
      workplaceId: null,
    });
    expect(units().units[holder]).toMatchObject({ workplaceId: buildingId });
  });
  it('чужое или исчезнувшее здание не допускает назначения', () => {
    const buildingId = useBuildingsStore
      .getState()
      .spawnBuilding('mine', 10, 1, 'p2')!;
    expect(
      getContextWorkplace(units().units[workerId], 'p1', target),
    ).toBeNull();
    expect(giveWorkOrder({ actor: 'p1', workerId, buildingId })).toMatchObject({
      code: 'owner',
    });
    expect(
      giveWorkOrder({ actor: 'p1', workerId, buildingId: 'missing' }),
    ).toMatchObject({ code: 'notFound' });
  });
  it('прямое движение снимает приказ работы', () => {
    const buildingId = useBuildingsStore
      .getState()
      .spawnBuilding('mine', 10, 1, 'p1')!;
    giveWorkOrder({ actor: 'p1', workerId, buildingId });
    expect(move({ actor: 'p1', unitId: workerId, x: 1, y: 1 })).toEqual(ok);
    expect(units().units[workerId].order).toBeUndefined();
  });
  it('busy у соседнего здания не останавливает приказ', () => {
    const buildingId = useBuildingsStore
      .getState()
      .spawnBuilding('mine', 10, 1, 'p1')!;
    units().placeUnit(workerId, 9, 1);
    giveWorkOrder({ actor: 'p1', workerId, buildingId });
    const before = units().units[workerId];
    runCommand({ type: 'order', actor: 'p1', details: {} }, 1, () => {
      expect(execute()).toEqual([]);
      return ok;
    });
    expect(units().units[workerId]).toEqual(before);
  });
});
