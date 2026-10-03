import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell, type CellType } from '@shared/config';
import { ok } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { useKnowledgeStore } from '@entities/perceptions';
import { move } from './move';
import {
  advanceOrder,
  cancelOrder,
  executeOrders,
  getRoutePreview,
  giveGoToOrder,
  goTo,
} from './goTo';

const units = () => useUnitsStore.getState();

/** Коридор 12 × 1: обзор рабочего 3 клетки, движение 4 очка. */
const corridor = (types: Partial<Record<number, CellType>> = {}): Cell[][] => [
  Array.from({ length: 12 }, (_, x) => ({
    x,
    y: 0,
    type: types[x] ?? 'grass',
    isWalkable: !types[x],
  })),
];

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useJournalStore.getState().newGame();
  useKnowledgeStore.setState({ byParticipant: {} });
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  useMapStore.setState({ grid: corridor() });
});

const readyWorker = (x = 0) => {
  const id = units().spawnUnit('worker', x, 0, 'p1')!;
  units().resetUnitsForNewTurn('p1');
  return id;
};

describe('приказ «Идти в точку»', () => {
  it('идёт на оставшиеся очки, сохраняется и снимается по прибытии', () => {
    const unitId = readyWorker();
    expect(
      getRoutePreview(units().units[unitId], 'p1', { x: 11, y: 0 }),
    ).toMatchObject({ turns: 3 });

    expect(goTo({ actor: 'p1', unitId, x: 11, y: 0 })).toEqual(ok);
    expect(units().units[unitId]).toMatchObject({
      x: 4,
      movePoints: 0,
      order: { type: 'goto', x: 11, y: 0 },
    });
    // react-doctor-disable-next-line no-json-parse-stringify-clone -- Проверяем JSON-сериализацию приказа для сохранения, а не клонирование.
    expect(JSON.parse(JSON.stringify(units().units[unitId])).order).toEqual({
      type: 'goto',
      x: 11,
      y: 0,
    });

    // Без очков приказ ждёт, а не останавливается.
    expect(executeOrders('p1')).toEqual([]);
    for (const x of [8, 11]) {
      units().resetUnitsForNewTurn('p1');
      expect(executeOrders('p1')).toEqual([]);
      expect(units().units[unitId].x).toBe(x);
    }
    expect(units().units[unitId].order).toBeUndefined();
  });

  it('прямой приказ заменяет приказ; шаги самого приказа его не снимают', () => {
    const unitId = readyWorker();
    giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 });
    advanceOrder('p1', unitId);
    expect(units().units[unitId].order).toBeDefined();
    units().resetUnitsForNewTurn('p1');
    expect(move({ actor: 'p1', unitId, x: 5, y: 0 })).toEqual(ok);
    expect(units().units[unitId].order).toBeUndefined();
  });

  it('отменяется командой; без приказа отмена отклоняется', () => {
    const unitId = readyWorker();
    giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 });
    expect(cancelOrder({ actor: 'p1', unitId })).toEqual(ok);
    expect(units().units[unitId]).toMatchObject({ x: 0, movePoints: 4 });
    expect(units().units[unitId].order).toBeUndefined();
    expect(cancelOrder({ actor: 'p1', unitId })).toMatchObject({
      code: 'target',
    });
  });

  it('не принимает цель без пути и приказ не в свой ход', () => {
    useMapStore.setState({ grid: corridor({ 1: 'water' }) });
    const unitId = readyWorker();
    expect(giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 })).toMatchObject({
      code: 'path',
    });
    expect(giveGoToOrder({ actor: 'p2', unitId, x: 0, y: 0 })).toMatchObject({
      code: 'turn',
    });
    expect(units().units[unitId].order).toBeUndefined();
  });

  it('останавливается с причиной у открывшейся преграды без обхода и не даёт повторных шагов', () => {
    useMapStore.setState({ grid: corridor({ 8: 'water' }) });
    const unitId = readyWorker();
    goTo({ actor: 'p1', unitId, x: 11, y: 0 });
    units().resetUnitsForNewTurn('p1');

    expect(executeOrders('p1')).toEqual([unitId]);
    const stopped = units().units[unitId];
    expect(stopped.order).toMatchObject({ stopped: 'path' });
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unitId]).toEqual(stopped);
    // Остановленный приказ не исполняется и в следующий ход.
    units().resetUnitsForNewTurn('p1');
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unitId].x).toBe(stopped.x);
  });

  it('останавливается, когда в обзоре появился новый враг', () => {
    units().spawnUnit('swordsman', 6, 0, 'p2');
    useMapStore.setState({ grid: corridor() });
    const unitId = readyWorker();
    expect(goTo({ actor: 'p1', unitId, x: 11, y: 0 })).toEqual(ok);
    expect(units().units[unitId].x).toBe(3);
    expect(units().units[unitId].order).toMatchObject({ stopped: 'enemy' });
  });

  it('не ждёт бесконечно, если транзит через своих дороже полного запаса', () => {
    const unitId = readyWorker();
    expect(giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 })).toEqual(ok);
    // Свои встали на маршрут после постановки приказа: до первой свободной
    // клетки 5 очков при максимуме 4.
    for (const x of [1, 2, 3, 4]) units().spawnUnit('worker', x, 0, 'p1');
    expect(executeOrders('p1')).toEqual([unitId]);
    expect(units().units[unitId]).toMatchObject({
      x: 0,
      order: { stopped: 'path' },
    });
    expect(giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 })).toMatchObject({
      code: 'path',
    });
  });

  it('busy не останавливает приказ, даже если путь исчез', () => {
    const unitId = readyWorker();
    giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 });
    useMapStore.getState().setCell(1, 0, { type: 'water', isWalkable: false });
    const before = units().units[unitId];
    runCommand({ type: 'order', actor: 'p1', details: {} }, 1, () => {
      expect(advanceOrder('p1', unitId)).toBe(false);
      return ok;
    });
    expect(units().units[unitId]).toEqual(before);
  });

  it('вне своего хода приказ не исполняется и не меняется', () => {
    const unitId = readyWorker();
    giveGoToOrder({ actor: 'p1', unitId, x: 11, y: 0 });
    useGameLoopStore.setState({ activePlayer: 'p2' });
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unitId]).toMatchObject({
      x: 0,
      order: { type: 'goto', x: 11, y: 0 },
    });
    expect(units().units[unitId].order?.stopped).toBeUndefined();
  });

  it('обходит своих, если прямой транзит дороже полного запаса', () => {
    useMapStore.setState({
      grid: [...corridor(), ...corridor()].map((row, y) =>
        row.map(cell => ({ ...cell, y })),
      ),
    });
    const unitId = readyWorker();
    for (const x of [1, 2, 3, 4]) units().spawnUnit('worker', x, 0, 'p1');
    const preview = getRoutePreview(units().units[unitId], 'p1', {
      x: 11,
      y: 0,
    });
    expect(preview?.path).toContainEqual({ x: 4, y: 1 });
    expect(goTo({ actor: 'p1', unitId, x: 11, y: 0 })).toEqual(ok);
    expect(units().units[unitId]).toMatchObject({ x: 3, y: 1 });
    expect(units().units[unitId].order?.stopped).toBeUndefined();
  });

  it('сохраняет короткий транзит в обходе', () => {
    useMapStore.setState({
      grid: [...corridor(), ...corridor()].map((row, y) =>
        row.map(cell => ({ ...cell, y })),
      ),
    });
    const unitId = readyWorker();
    for (const [x, y] of [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [3, 1],
    ]) {
      units().spawnUnit('worker', x, y, 'p1');
    }
    const preview = getRoutePreview(units().units[unitId], 'p1', {
      x: 11,
      y: 0,
    });
    expect(preview?.path).toContainEqual({ x: 3, y: 1 });
    // (1,0) — транзит к (1,1); на отрезок через своего в (3,1) очков не
    // хватает — ждёт на (2,1), в следующий ход проходит его.
    expect(goTo({ actor: 'p1', unitId, x: 11, y: 0 })).toEqual(ok);
    expect(units().units[unitId]).toMatchObject({ x: 2, y: 1 });
    units().resetUnitsForNewTurn('p1');
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unitId]).toMatchObject({ x: 6, y: 1, movePoints: 0 });
    expect(units().units[unitId].order?.stopped).toBeUndefined();
    const afterMove = units().units[unitId];
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unitId]).toEqual(afterMove);
    for (let turn = 0; turn < 2; turn++) {
      units().resetUnitsForNewTurn('p1');
      expect(executeOrders('p1')).toEqual([]);
    }
    expect(units().units[unitId]).toMatchObject({ x: 11, y: 0 });
    expect(units().units[unitId].order).toBeUndefined();
  });
});
