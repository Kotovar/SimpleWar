import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useKnowledgeStore } from '@entities/perceptions';
import { move } from './move';
import { canUnitStep, getUnitReachableCells } from './air';
import {
  createKnownMovementGrid,
  TURN_UNKNOWN_COST,
} from './createKnownMovementGrid';
import { getPath } from './getPath';

const units = () => useUnitsStore.getState();

/** Коридор 12 × 1: обзор рабочего 3 клетки, движение 4 очка. */
const corridor = (): Cell[][] => [
  Array.from({ length: 12 }, (_, x) => ({
    x,
    y: 0,
    type: 'grass' as const,
    isWalkable: true,
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

const readyWorker = (x: number) => {
  const id = units().spawnUnit('worker', x, 0, 'p1')!;
  units().resetUnitsForNewTurn('p1');
  return id;
};

describe('движение под туманом', () => {
  it.each([
    { type: 'water' as const, points: 7 },
    { type: 'mountain' as const, points: 7 },
    { type: 'water' as const, points: 5 },
  ])(
    'обходит открывшуюся преграду $type с бюджетом $points',
    ({ type, points }) => {
      useMapStore.setState({
        grid: Array.from({ length: 3 }, (_, y) =>
          Array.from({ length: 12 }, (_, x) => ({
            x,
            y,
            type: 'grass',
            isWalkable: true,
          })),
        ),
      });
      const worker = units().spawnUnit('worker', 0, 1, 'p1', true)!;
      useUnitsStore.setState(state => ({
        units: {
          ...state.units,
          [worker]: { ...state.units[worker], movePoints: points },
        },
      }));
      const target = { x: 5, y: 1 };
      const planned = getPath(
        units().units[worker],
        target,
        createKnownMovementGrid('p1', TURN_UNKNOWN_COST),
      );
      useMapStore.getState().setCell(4, 1, { type, isWalkable: false });
      // Скрытая местность не влияет ни на путь, ни на его цену.
      expect(
        getPath(
          units().units[worker],
          target,
          createKnownMovementGrid('p1', TURN_UNKNOWN_COST),
        ),
      ).toEqual(planned);
      expect(planned.cost).toBe(5);

      const visited: { x: number; y: number }[] = [];
      const unsubscribe = useUnitsStore.subscribe(state => {
        const { x, y } = state.units[worker];
        visited.push({ x, y });
      });
      try {
        expect(move({ actor: 'p1', unitId: worker, ...target })).toEqual({
          ok: true,
        });
        expect(units().units[worker].movePoints).toBe(0);
        if (points === 7) {
          expect(units().units[worker]).toMatchObject(target);
        } else {
          expect(units().units[worker].x).toBeLessThan(target.x);
        }
        expect(visited).not.toContainEqual({ x: 4, y: 1 });
        expect(visited.some(({ y }) => y !== 1)).toBe(true);
      } finally {
        unsubscribe();
      }
    },
  );

  it('останавливается перед скрытым врагом и тратит только пройденные клетки', () => {
    const worker = readyWorker(0);
    // Враг в 5,0 вне обзора (3 клетки) и занимает клетку на пути к 6,0.
    units().spawnUnit('swordsman', 5, 0, 'p2');

    // Цель за врагом: он скрыт, поэтому отказ по занятости не раскрывается.
    const result = move({ actor: 'p1', unitId: worker, x: 4, y: 0 });

    expect(result.ok).toBe(true);
    // Шаг в 2,0 открывает врага (обзор до 5,0): стоп, потрачено 2 очка.
    expect(units().units[worker]).toMatchObject({ x: 2, movePoints: 2 });
  });

  it('скрытая занятая цель не отклоняется как занятая', () => {
    const worker = readyWorker(0);
    units().spawnUnit('swordsman', 4, 0, 'p2');

    const result = move({ actor: 'p1', unitId: worker, x: 4, y: 0 });

    expect(result).toEqual({ ok: true });
    expect(units().units[worker].x).toBeLessThan(4);
  });

  it('видимая занятая цель отклоняется без изменений', () => {
    const worker = readyWorker(0);
    units().spawnUnit('swordsman', 2, 0, 'p2');

    const result = move({ actor: 'p1', unitId: worker, x: 2, y: 0 });

    expect(result).toMatchObject({ ok: false, code: 'occupied' });
    expect(units().units[worker]).toMatchObject({ x: 0, movePoints: 4 });
  });

  it('проходит весь путь, если враг не обнаружен', () => {
    const worker = readyWorker(0);

    expect(move({ actor: 'p1', unitId: worker, x: 4, y: 0 }).ok).toBe(true);
    expect(units().units[worker]).toMatchObject({ x: 4, movePoints: 0 });
  });

  it('планирует неизвестные клетки с повышенной ценой', () => {
    readyWorker(0);
    const costs = createKnownMovementGrid('p1')[0];

    // Видимые 1..3 — поле, дальше — неизвестность.
    expect(costs.slice(1, 6)).toEqual([1, 1, 1, 2, 2]);
  });

  it('скрытая преграда не меняет план, но останавливает движение', () => {
    const worker = readyWorker(0);
    // Цель 5,0 за пределами обзора; план через неизвестные 4 и 5 стоит 3 + 2 + 2.
    units().resetUnitsForNewTurn('p1');
    useUnitsStore.setState(state => ({
      units: {
        ...state.units,
        [worker]: { ...state.units[worker], movePoints: 7 },
      },
    }));
    useMapStore.getState().setCell(4, 0, { type: 'water', isWalkable: false });

    expect(move({ actor: 'p1', unitId: worker, x: 5, y: 0 }).ok).toBe(true);
    // Первый шаг открывает воду; известного обхода нет — сразу остановка.
    expect(units().units[worker]).toMatchObject({ x: 1, movePoints: 6 });
  });
});

describe('проход через своих', () => {
  it('выходит из окружения своими юнитами', () => {
    const grid: Cell[][] = Array.from({ length: 5 }, (_, y) =>
      Array.from({ length: 5 }, (_, x) => ({
        x,
        y,
        type: 'grass',
        isWalkable: true,
      })),
    );
    useMapStore.setState({ grid });
    const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;
    for (const [x, y] of [
      [1, 2],
      [3, 2],
      [2, 1],
      [2, 3],
    ]) {
      units().spawnUnit('swordsman', x, y, 'p1');
    }
    expect(
      getUnitReachableCells(units().units[worker], 'p1', 1),
    ).toContainEqual({ x: 4, y: 2 });
    expect(move({ actor: 'p1', unitId: worker, x: 4, y: 2 }).ok).toBe(true);
    expect(units().units[worker]).toMatchObject({ x: 4, y: 2, movePoints: 2 });
  });

  it('выходит из коридора через двух своих без совместного размещения', () => {
    const worker = readyWorker(0);
    const first = readyWorker(1);
    const second = readyWorker(2);
    const overlaps: boolean[] = [];
    const unsubscribe = useUnitsStore.subscribe(state => {
      const positions = Object.values(state.units).map(u => `${u.x},${u.y}`);
      overlaps.push(new Set(positions).size !== positions.length);
    });
    try {
      expect(move({ actor: 'p1', unitId: worker, x: 3, y: 0 }).ok).toBe(true);
      expect(units().units[worker]).toMatchObject({ x: 3, movePoints: 1 });
      expect(units().units[first].x).toBe(1);
      expect(units().units[second].x).toBe(2);
      expect(overlaps).not.toContain(true);
    } finally {
      unsubscribe();
    }
  });

  it('подсвечивает свободную клетку за своим, но не самого своего', () => {
    const worker = readyWorker(0);
    readyWorker(1);
    const reachable = getUnitReachableCells(units().units[worker], 'p1', 1);
    expect(reachable).toContainEqual({ x: 2, y: 0 });
    expect(reachable).not.toContainEqual({ x: 1, y: 0 });
    expect(move({ actor: 'p1', unitId: worker, x: 1, y: 0 })).toMatchObject({
      code: 'occupied',
    });
  });

  it('считает цену рельефа под своим и требует очков до свободной клетки', () => {
    const worker = readyWorker(0);
    readyWorker(1);
    useMapStore.getState().setCell(1, 0, { type: 'swamp', isWalkable: true });
    expect(move({ actor: 'p1', unitId: worker, x: 2, y: 0 }).ok).toBe(true);
    expect(units().units[worker]).toMatchObject({ x: 2, movePoints: 1 });
    expect(move({ actor: 'p1', unitId: worker, x: 0, y: 0 })).toMatchObject({
      code: 'points',
    });
    expect(units().units[worker]).toMatchObject({ x: 2, movePoints: 1 });
  });

  it.each(['enemy', 'building', 'water'] as const)(
    'не проходит через %s',
    obstacle => {
      const worker = readyWorker(0);
      if (obstacle === 'enemy') units().spawnUnit('worker', 1, 0, 'p2');
      else if (obstacle === 'building') {
        readyWorker(1);
        useBuildingsStore.getState().spawnBuilding('mine', 1, 0, 'p1');
      } else {
        readyWorker(1);
        useMapStore
          .getState()
          .setCell(1, 0, { type: 'water', isWalkable: false });
      }
      expect(move({ actor: 'p1', unitId: worker, x: 2, y: 0 })).toMatchObject({
        code: 'path',
      });
      expect(units().units[worker]).toMatchObject({ x: 0, movePoints: 4 });
    },
  );
});

describe('canUnitStep', () => {
  it('остатка очков не хватает на соседние холмы — шага нет', () => {
    useMapStore.setState({
      grid: Array.from({ length: 3 }, (_, y) =>
        Array.from({ length: 3 }, (_, x) => ({
          x,
          y,
          type: 'hill' as const,
          isWalkable: true,
        })),
      ),
    });
    const id = units().spawnUnit('scout', 1, 1, 'p1')!;
    const patch = (movePoints: number) =>
      useUnitsStore.setState(state => ({
        units: { ...state.units, [id]: { ...state.units[id], movePoints } },
      }));

    patch(1);
    expect(canUnitStep(units().units[id])).toBe(false);
    patch(2);
    expect(canUnitStep(units().units[id])).toBe(true);
  });
});
