import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_PARTICIPANTS,
  type Cell,
  type ProductionBuilding,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { useKnowledgeStore } from '@entities/perceptions';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { spawnAtRallyPoint } from './spawnAtRallyPoint';

const buildings = () => useBuildingsStore.getState();
const units = () => useUnitsStore.getState();
let building: ProductionBuilding;

beforeEach(() => {
  useBuildingsStore.setState({
    buildings: {},
    selectedBuildingForSpawn: null,
    selectedRallyBuildingId: null,
  });
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
  const grid: Cell[][] = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 11 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  const id = buildings().spawnBuilding('base', 3, 2, 'p1')!;
  const created = buildings().buildings[id];
  if (created.role !== 'production') throw Error('Production expected');
  building = { ...created, rallyPoint: { x: 9, y: 2 } };
  buildings().setRallyPoint(id, building.rallyPoint!);
  useEconomyStore.getState().addResources('p1', { gold: 1000, wood: 1000 });
});

describe('автоматический найм к точке сбора', () => {
  it('выбирает ближайший свободный сосед по цене пути, не даёт очков', () => {
    expect(spawnAtRallyPoint('p1', building, 'worker')).toEqual(ok);
    expect(Object.values(units().units)[0]).toMatchObject({
      x: 4,
      y: 2,
      movePoints: 0,
      order: { type: 'goto', x: 9, y: 2 },
    });
  });
  it('учитывает обход: геометрически ближайшая клетка проигрывает по пути', () => {
    useMapStore
      .getState()
      .setCell(5, 2, { type: 'mountain', isWalkable: false });
    expect(spawnAtRallyPoint('p1', building, 'worker')).toEqual(ok);
    expect(Object.values(units().units)[0]).toMatchObject({ x: 4, y: 1 });
  });
  it('занятый лучший сосед не допускает наложения', () => {
    units().spawnUnit('worker', 4, 2, 'p1');
    expect(spawnAtRallyPoint('p1', building, 'worker')).toEqual(ok);
    const created = Object.values(units().units).filter(u => u.order);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ x: 4, y: 1 });
  });
  it('летающий выбирает путь через воду по своему профилю', () => {
    const id = buildings().spawnBuilding('sanctuary', 7, 2, 'p1')!;
    buildings().setRallyPoint(id, { x: 10, y: 2 });
    buildings().resetBuildingsForNewTurn('p1');
    const sanctuary = buildings().buildings[id];
    if (sanctuary.role !== 'production') throw Error('Production expected');
    useMapStore.getState().setCell(9, 2, { type: 'water', isWalkable: false });
    expect(spawnAtRallyPoint('p1', sanctuary, 'griffon')).toEqual(ok);
    expect(Object.values(units().units)[0]).toMatchObject({
      type: 'griffon',
      x: 8,
      y: 2,
      order: { x: 10, y: 2 },
    });
  });

  it('без свободных соседей найм отказывает без списаний и создания', () => {
    for (let y = 1; y <= 3; y++)
      for (let x = 2; x <= 4; x++)
        if (x !== 3 || y !== 2) units().spawnUnit('worker', x, y, 'p1');
    const before = useEconomyStore.getState().resources.p1;
    expect(spawnAtRallyPoint('p1', building, 'worker')).toEqual(
      reject('occupied'),
    );
    expect(Object.values(units().units)).toHaveLength(8);
    expect(useEconomyStore.getState().resources.p1).toEqual(before);
    expect(buildings().buildings[building.id]).toMatchObject({
      spawnPoints: 1,
    });
  });
  it('свободная точка рядом может стать местом появления без приказа', () => {
    building.rallyPoint = { x: 4, y: 2 };
    buildings().setRallyPoint(building.id, building.rallyPoint);
    expect(spawnAtRallyPoint('p1', building, 'worker')).toEqual(ok);
    const unit = Object.values(units().units)[0];
    expect(unit).toMatchObject({ x: 4, y: 2 });
    expect(unit.order).toBeUndefined();
  });
});
