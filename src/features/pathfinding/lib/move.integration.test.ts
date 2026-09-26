import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { move } from './move';
import { createKnownMovementGrid } from './createKnownMovementGrid';

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
    // Вода открывается на подходе: юнит встаёт перед ней.
    expect(units().units[worker]).toMatchObject({ x: 3, movePoints: 4 });
  });
});
