import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { ok } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { useResearchStore } from '@entities/researches';
import { initVisibilitySystem } from '@features/visibility';
import { autoExplore, getExplorationTarget } from '@features/pathfinding';
import {
  advanceOrder,
  cancelOrder,
  executeOrders,
  getOrderStopMessage,
} from '@features/pathfinding';
import { move, canUnitStep } from '@features/pathfinding';
import { getPendingUnits, setUnitRest } from '@features/game-loop';

const units = () => useUnitsStore.getState();
let unitId: string;
beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useKnowledgeStore.getState().resetStore();
  useJournalStore.getState().newGame();
  useDebugStore.getState().resetStore();
  useResearchStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = [
    Array.from({ length: 25 }, (_, x) => ({
      x,
      y: 0,
      type: 'grass',
      isWalkable: true,
    })),
  ];
  useMapStore.setState({ grid });
  unitId = units().spawnUnit('scout', 0, 0, 'p1')!;
  units().resetUnitsForNewTurn('p1');
  initVisibilitySystem();
});

describe('авторазведка', () => {
  it('выбирает ближайшую границу по цене, открывает карту и сериализуется', () => {
    expect(
      getExplorationTarget(units().units[unitId], 'p1')?.path.at(-1),
    ).toEqual({ x: 7, y: 0 });
    expect(autoExplore({ actor: 'p1', unitId })).toEqual(ok);
    expect(units().units[unitId]).toMatchObject({
      x: 5,
      movePoints: 0,
      order: { type: 'explore' },
    });
    const first = units().units[unitId];
    expect(executeOrders('p1')).toEqual([]);
    expect(units().units[unitId]).toEqual(first);
    // react-doctor-disable-next-line no-json-parse-stringify-clone -- Проверяем сериализуемую форму приказа, а не клонирование.
    expect(JSON.parse(JSON.stringify(first.order)).type).toBe('explore');
    for (const x of [10, 15]) {
      units().resetUnitsForNewTurn('p1');
      expect(executeOrders('p1')).toEqual([]);
      expect(units().units[unitId].x).toBe(x);
    }
    units().resetUnitsForNewTurn('p1');
    expect(executeOrders('p1')).toEqual([unitId]);
    expect(units().units[unitId]).toMatchObject({
      x: 18,
      movePoints: 2,
      order: { stopped: 'explored' },
    });
    expect(
      useKnowledgeStore.getState().byParticipant.p1?.terrain.every(Boolean),
    ).toBe(true);
    expect(getOrderStopMessage('explored')).toContain('Нет достижимых');
    expect(executeOrders('p1')).toEqual([]);
  });
  it('не использует скрытую местность или скрытых врагов для выбора', () => {
    const before = getExplorationTarget(units().units[unitId], 'p1');
    useMapStore.getState().setCell(15, 0, { type: 'water', isWalkable: false });
    units().spawnUnit('swordsman', 14, 0, 'p2');
    expect(getExplorationTarget(units().units[unitId], 'p1')).toEqual(before);
    expect(autoExplore({ actor: 'p1', unitId })).toEqual(ok);
    expect(units().units[unitId]).toMatchObject({ x: 5 });
    expect(units().units[unitId].order?.stopped).toBeUndefined();
  });
  it('враг, уже видимый при включении, останавливает без шага', () => {
    units().spawnUnit('swordsman', 5, 0, 'p2');
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId]).toMatchObject({
      x: 0,
      movePoints: 5,
      order: { stopped: 'enemy' },
    });
  });
  it('новый враг останавливает на первом шаге, открывшем его', () => {
    units().spawnUnit('swordsman', 10, 0, 'p2');
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId]).toMatchObject({
      x: 4,
      movePoints: 1,
      order: { stopped: 'enemy' },
    });
    expect(executeOrders('p1')).toEqual([]);
  });
  it('известная отметка осады на следующем шаге останавливает перед ней', () => {
    const siegeId = units().spawnUnit('siege', 24, 0, 'p2')!;
    units().setPreparedStrike(siegeId, { x: 1, y: 0 });
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId]).toMatchObject({
      x: 0,
      movePoints: 5,
      order: { stopped: 'threat' },
    });
  });
  it('не раскрывает скрытую наводку осады', () => {
    useResearchStore.setState({ completed: { p2: ['hiddenAiming'] } });
    const siegeId = units().spawnUnit('siege', 24, 0, 'p2')!;
    units().setPreparedStrike(siegeId, { x: 15, y: 0 });
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId]).toMatchObject({ x: 5 });
    expect(units().units[unitId].order?.stopped).toBeUndefined();
  });
  it('останавливается, если неизвестное отделено известной водой', () => {
    useMapStore.getState().setCell(6, 0, { type: 'water', isWalkable: false });
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId]).toMatchObject({
      x: 0,
      order: { stopped: 'explored' },
    });
  });
  it('без очков ждёт, а при нехватке очков на транзит не делает бесплатных шагов', () => {
    for (const x of [1, 2, 3]) units().spawnUnit('worker', x, 0, 'p1');
    units().moveUnit(unitId, 0, 0, 2);
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId]).toMatchObject({ x: 0, movePoints: 3 });
    expect(units().units[unitId].order?.stopped).toBeUndefined();
    units().resetUnitsForNewTurn('p1');
    executeOrders('p1');
    expect(units().units[unitId]).toMatchObject({ x: 5, movePoints: 0 });
  });
  it('прямой приказ снимает режим, U отменяет его без расхода очков', () => {
    autoExplore({ actor: 'p1', unitId });
    units().resetUnitsForNewTurn('p1');
    expect(move({ actor: 'p1', unitId, x: 6, y: 0 })).toEqual(ok);
    expect(units().units[unitId].order).toBeUndefined();
    autoExplore({ actor: 'p1', unitId });
    expect(cancelOrder({ actor: 'p1', unitId })).toEqual(ok);
    expect(units().units[unitId].order).toBeUndefined();
  });
  it('приказ исключается из Tab и напоминания, остановленный возвращается даже без очков', () => {
    autoExplore({ actor: 'p1', unitId });
    const active = units().units[unitId];
    expect(getPendingUnits([active], 'p1', canUnitStep, () => true)).toEqual(
      [],
    );
    units().setOrder(unitId, {
      type: 'explore',
      x: 12,
      y: 0,
      stopped: 'enemy',
    });
    const stopped = units().units[unitId];
    expect(getPendingUnits([stopped], 'p1', canUnitStep, () => false)).toEqual([
      stopped,
    ]);
  });
  it('сон заменяется авторазведкой; пропуск отменяет приказ и не возвращает очки', () => {
    expect(setUnitRest({ actor: 'p1', unitId, mode: 'sleep' })).toEqual(ok);
    autoExplore({ actor: 'p1', unitId });
    expect(units().units[unitId].restMode).toBeUndefined();
    expect(units().units[unitId].order?.type).toBe('explore');
    expect(setUnitRest({ actor: 'p1', unitId, mode: 'skip' })).toEqual(ok);
    expect(units().units[unitId].order).toBeUndefined();
    expect(units().units[unitId].movePoints).toBe(0);
  });
  it('цена пути важнее расстояния до границы', () => {
    const grid: Cell[][] = Array.from({ length: 15 }, (_, y) =>
      Array.from({ length: 11 }, (_, x) => ({
        x,
        y,
        type: x === 5 && y > 0 && y < 7 ? 'swamp' : 'grass',
        isWalkable: true,
      })),
    );
    useMapStore.setState({ grid });
    units().placeUnit(unitId, 5, 7);
    useKnowledgeStore.getState().resetStore();
    initVisibilitySystem();
    const plan = getExplorationTarget(units().units[unitId], 'p1');
    expect(plan?.cost).toBe(7);
    expect(plan?.path.at(-1)).toEqual({ x: 4, y: 1 });
  });

  it('только свой разведчик и только свой ход; чужие знания не используются', () => {
    const workerId = units().spawnUnit('worker', 0, 0, 'p1')!;
    expect(autoExplore({ actor: 'p1', unitId: workerId })).toMatchObject({
      code: 'actionType',
    });
    expect(autoExplore({ actor: 'p1', unitId: 'missing' })).toMatchObject({
      code: 'notFound',
    });
    expect(
      autoExplore({
        actor: 'p1',
        unitId: units().spawnUnit('scout', 20, 0, 'p2')!,
      }),
    ).toMatchObject({ code: 'owner' });
    useGameLoopStore.setState({ activePlayer: 'p2' });
    expect(autoExplore({ actor: 'p1', unitId })).toMatchObject({
      code: 'turn',
    });
  });
  it('busy и чужой ход сохраняют активный приказ без изменений', () => {
    autoExplore({ actor: 'p1', unitId });
    units().resetUnitsForNewTurn('p1');
    const before = units().units[unitId];
    runCommand({ type: 'order', actor: 'p1', details: {} }, 1, () => {
      expect(advanceOrder('p1', unitId)).toBe(false);
      return ok;
    });
    expect(units().units[unitId]).toEqual(before);
    useGameLoopStore.setState({ activePlayer: 'p2' });
    expect(advanceOrder('p1', unitId)).toBe(false);
    expect(units().units[unitId]).toEqual(before);
  });
  it('busy при обнаружении конца разведки не меняет статус', () => {
    useMapStore.setState({
      grid: useMapStore.getState().grid.map(row => row.slice(0, 5)),
    });
    units().setOrder(unitId, { type: 'explore', x: 0, y: 0 });
    const before = units().units[unitId];
    runCommand({ type: 'order', actor: 'p1', details: {} }, 1, () => {
      expect(advanceOrder('p1', unitId)).toBe(false);
      return ok;
    });
    expect(units().units[unitId]).toEqual(before);
  });
});
