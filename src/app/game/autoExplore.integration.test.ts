import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { gameEvents, ok } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { useResearchStore } from '@entities/researches';
import { initVisibilitySystem } from '@features/visibility';
import {
  autoExplore,
  getExplorationDanger,
  getExplorationTarget,
} from '@features/pathfinding';
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
  it('видимый враг не останавливает: разведчик обходит его стороной', () => {
    const grid: Cell[][] = Array.from({ length: 9 }, (_, y) =>
      Array.from({ length: 25 }, (_, x) => ({
        x,
        y,
        type: 'grass',
        isWalkable: true,
      })),
    );
    useMapStore.setState({ grid });
    units().placeUnit(unitId, 0, 1);
    units().spawnUnit('swordsman', 6, 1, 'p2');
    units().spawnUnit('worker', 2, 4, 'p2');
    useKnowledgeStore.getState().resetStore();
    initVisibilitySystem();
    const width = 25;
    for (let turn = 0; turn < 4; turn++) {
      if (turn) {
        units().resetUnitsForNewTurn('p1');
        executeOrders('p1');
      } else expect(autoExplore({ actor: 'p1', unitId })).toEqual(ok);
      const scout = units().units[unitId];
      expect(scout.order?.stopped).toBeUndefined();
      // Мечник бьёт на 1 клетку: запас 2 — разведчик не ближе 4 клеток.
      expect(Math.abs(scout.x - 6) + Math.abs(scout.y - 1)).toBeGreaterThan(3);
    }
    expect(units().units[unitId].x).toBeGreaterThan(6);
    const danger = getExplorationDanger(
      'p1',
      width,
      9,
      new Uint8Array(width * 9).fill(1),
    );
    // Рабочий опасности не создаёт.
    expect(danger[4 * width + 2]).toBe(0);
    expect(danger[1 * width + 6]).toBeGreaterThan(0);
  });

  const openGrid = (width: number, height: number): Cell[][] =>
    Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({
        x,
        y,
        type: 'grass',
        isWalkable: true,
      })),
    );

  it('исполнение идёт тем же обходом, что и план: транзит не через опасную клетку', () => {
    useMapStore.setState({ grid: openGrid(25, 7) });
    units().placeUnit(unitId, 0, 3);
    units().spawnUnit('swordsman', 1, 0, 'p2');
    for (const x of [0, 1, 2]) units().spawnUnit('worker', x, 4, 'p1');
    useKnowledgeStore.getState().resetStore();
    initVisibilitySystem();
    const visited: string[] = [];
    const off = useUnitsStore.subscribe(state => {
      const scout = state.units[unitId];
      if (scout) visited.push(`${scout.x},${scout.y}`);
    });
    const passed: string[] = [];
    const offPassed = gameEvents.subscribe(event => {
      if (event.type === 'UNIT_PASSED' && event.unitId === unitId)
        passed.push(`${event.x},${event.y}`);
    });
    autoExplore({ actor: 'p1', unitId });
    off();
    offPassed();
    expect(units().units[unitId].x).toBeGreaterThan(0);
    // (1,3) — в трёх клетках от мечника: запрещена.
    expect([...visited, ...passed]).not.toContain('1,3');
  });

  it('разведчик в опасной зоне выходит из неё, а не останавливается', () => {
    useMapStore.setState({ grid: openGrid(25, 9) });
    units().placeUnit(unitId, 5, 4);
    units().spawnUnit('swordsman', 7, 4, 'p2');
    useKnowledgeStore.getState().resetStore();
    initVisibilitySystem();
    autoExplore({ actor: 'p1', unitId });
    const scout = units().units[unitId];
    expect(scout.order?.stopped).toBeUndefined();
    expect(scout.movePoints).toBeLessThan(5);
    expect(Math.abs(scout.x - 7) + Math.abs(scout.y - 4)).toBeGreaterThan(2);
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
