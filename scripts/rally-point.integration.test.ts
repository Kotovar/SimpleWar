import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { executeOrders } from '@features/pathfinding';
import { setRallyPoint, spawn } from '@features/spawn';

const buildings = () => useBuildingsStore.getState();
const units = () => useUnitsStore.getState();
let buildingId: string;
const setPoint = (x = 14, y = 1) =>
  setRallyPoint({ actor: 'p1', buildingId, target: { x, y } });
const recruit = (x = 1) =>
  spawn({ actor: 'p1', buildingId, unitType: 'worker', x, y: 1 });

beforeEach(() => {
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useKnowledgeStore.setState({ byParticipant: {} });
  useJournalStore.getState().newGame();
  useEconomyStore.getState().resetStore();
  useDebugStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = Array.from({ length: 3 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  buildingId = buildings().spawnBuilding('base', 0, 1, 'p1')!;
  useEconomyStore.getState().addResources('p1', { gold: 1000, wood: 1000 });
});

const point = () => {
  const building = buildings().buildings[buildingId];
  if (building.role !== 'production') throw Error('Production expected');
  return building.rallyPoint;
};

describe('точка сбора', () => {
  it('хранит сериализуемую цель и снимает её без расхода очков найма', () => {
    expect(setPoint()).toEqual(ok);
    expect(point()).toEqual({ x: 14, y: 1 });
    expect(buildings().buildings[buildingId]).toMatchObject({ spawnPoints: 1 });
    expect(
      JSON.parse(JSON.stringify(buildings().buildings[buildingId])).rallyPoint,
    ).toEqual({ x: 14, y: 1 });
    expect(setRallyPoint({ actor: 'p1', buildingId, target: null })).toEqual(
      ok,
    );
    expect(point()).toBeUndefined();
  });
  it('новобранец ждёт первых очков, затем исполняет C4 без бесплатных шагов', () => {
    expect(setPoint()).toEqual(ok);
    expect(recruit()).toEqual(ok);
    const unit = Object.values(units().units)[0];
    expect(unit).toMatchObject({
      x: 1,
      movePoints: 0,
      order: { type: 'goto', x: 14, y: 1 },
    });
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unit.id].x).toBe(1);
    units().resetUnitsForNewTurn('p1');
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unit.id]).toMatchObject({ x: 5, movePoints: 0 });
    executeOrders('p1');
    expect(units().units[unit.id].x).toBe(5);
  });
  it('смена и снятие цели действуют только на будущих новобранцев', () => {
    setPoint();
    recruit();
    const first = Object.values(units().units)[0];
    setPoint(13);
    buildings().resetBuildingsForNewTurn('p1');
    expect(recruit(-1)).toEqual(reject('bounds'));
    expect(
      spawn({ actor: 'p1', buildingId, unitType: 'worker', x: 1, y: 2 }),
    ).toEqual(ok);
    const second = Object.values(units().units).find(u => u.id !== first.id)!;
    expect(units().units[first.id].order).toMatchObject({ x: 14 });
    expect(second.order).toMatchObject({ x: 13 });
    setRallyPoint({ actor: 'p1', buildingId, target: null });
    expect(units().units[second.id].order).toMatchObject({ x: 13 });
  });
  it('без точки сбора найм сохраняет прежнее поведение', () => {
    expect(recruit()).toEqual(ok);
    expect(Object.values(units().units)[0].order).toBeUndefined();
  });
  it('новобранец на самой точке уже прибыл и не получает приказ', () => {
    setPoint(1);
    expect(recruit()).toEqual(ok);
    expect(Object.values(units().units)[0].order).toBeUndefined();
  });
  it('видимая занятая цель отклоняется без изменения прежней', () => {
    setPoint();
    units().spawnUnit('worker', 2, 1, 'p1');
    expect(setPoint(2)).toEqual(reject('occupied'));
    expect(point()).toEqual({ x: 14, y: 1 });
  });
  it('скрытая занятость не раскрывается ответом команды', () => {
    units().spawnUnit('worker', 14, 1, 'p2');
    expect(setPoint()).toEqual(ok);
  });
  it('занятая после установки цель останавливает приказ без наложения', () => {
    setPoint(2);
    recruit();
    const unit = Object.values(units().units)[0];
    units().spawnUnit('worker', 2, 1, 'p1');
    units().resetUnitsForNewTurn('p1');
    expect(executeOrders('p1')).toEqual([unit.id]);
    expect(units().units[unit.id]).toMatchObject({
      x: 1,
      order: { stopped: 'occupied' },
    });
  });
  it('отклоняет дробные координаты и выход за карту', () => {
    expect(setPoint(1.5)).toEqual(reject('bounds'));
    expect(setPoint(15)).toEqual(reject('bounds'));
    expect(point()).toBeUndefined();
  });
  it('проверяет сторону, ход, существование и роль здания', () => {
    expect(
      setRallyPoint({ actor: 'p2', buildingId, target: { x: 14, y: 1 } }),
    ).toEqual(reject('turn'));
    useGameLoopStore.setState({ activePlayer: 'p2' });
    expect(setRallyPoint({ actor: 'p2', buildingId, target: null })).toEqual(
      reject('owner'),
    );
    useGameLoopStore.setState({ activePlayer: 'p1' });
    expect(
      setRallyPoint({ actor: 'p1', buildingId: 'missing', target: null }),
    ).toEqual(reject('notFound'));
    const farm = buildings().spawnBuilding('farm', 3, 1, 'p1')!;
    expect(
      setRallyPoint({ actor: 'p1', buildingId: farm, target: null }),
    ).toEqual(reject('actionType'));
  });
  it('вложенный приказ busy не меняет точку', () => {
    expect(
      runCommand({ type: 'order', actor: 'p1' }, 1, () => setPoint()),
    ).toEqual(reject('busy'));
    expect(point()).toBeUndefined();
  });
});
