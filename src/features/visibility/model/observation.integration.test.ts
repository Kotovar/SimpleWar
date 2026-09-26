import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Cell, Participant } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useKnowledgeStore } from '@entities/perceptions';
import { initVisibilitySystem } from './refreshKnowledge';
import { getObservation } from './observation';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();

const THREE: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
];

const makeGrid = (width: number, height: number): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'grass' as const,
      isWalkable: true,
    })),
  );

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useKnowledgeStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    participants: THREE,
    eliminated: [],
    activePlayer: 'p1',
    currentTurn: 1,
  });
  useMapStore.setState({ grid: makeGrid(30, 10) });
  initVisibilitySystem();
});

describe('наблюдение участников', () => {
  it('у каждого участника своя зона обзора, в том числе втроём', () => {
    units().spawnUnit('worker', 1, 1, 'p1');
    units().spawnUnit('worker', 14, 1, 'p2');
    units().spawnUnit('worker', 28, 8, 'p3');

    const [p1, p2, p3] = (['p1', 'p2', 'p3'] as const).map(getObservation);
    expect(p1.visible[1][4]).toBe(true);
    expect(p1.visible[1][14]).toBe(false);
    expect(p2.visible[1][14]).toBe(true);
    expect(p2.visible[1][1]).toBe(false);
    expect(p3.knownTerrain[8][28]).toBe('grass');
    expect(p3.knownTerrain[1][1]).toBeNull();
    expect([p1, p2, p3].every(o => o.visibleEnemies.length === 0)).toBe(true);
  });

  it('гибель единственного источника снимает обзор, но не разведку', () => {
    const scout = units().spawnUnit('worker', 5, 5, 'p1')!;
    units().damageUnit(scout, 1000);

    const observation = getObservation('p1');
    expect(observation.visible.flat().some(Boolean)).toBe(false);
    expect(observation.knownTerrain[5][5]).toBe('grass');
  });

  it('видит врага в обзоре без скрытых полей и помнит его после ухода', () => {
    units().spawnUnit('worker', 1, 1, 'p1');
    const enemy = units().spawnUnit('archer', 3, 1, 'p2')!;

    const seen = getObservation('p1');
    expect(seen.visibleEnemies).toEqual([
      {
        id: enemy,
        kind: 'unit',
        type: 'archer',
        owner: 'p2',
        x: 3,
        y: 1,
        hp: 55,
        maxHp: 55,
      },
    ]);

    useUnitsStore.setState(state => ({
      units: { ...state.units, [enemy]: { ...state.units[enemy], x: 9 } },
    }));
    const lost = getObservation('p1');
    expect(lost.visibleEnemies).toEqual([]);
    // Клетка 3,1 видна и пуста — контакт опровергнут, а новая позиция скрыта.
    expect(lost.contacts).toEqual([]);
  });

  it('скрытые изменения далёкого мира не меняют наблюдение', () => {
    units().spawnUnit('worker', 1, 1, 'p1');
    const enemy = units().spawnUnit('swordsman', 20, 5, 'p2')!;
    const before = getObservation('p1');

    units().damageUnit(enemy, 50);
    buildings().spawnBuilding('tower', 22, 5, 'p2');
    useMapStore
      .getState()
      .setCell(25, 5, { type: 'forest', isWalkable: false });
    units().spawnUnit('worker', 27, 8, 'p3');

    expect(getObservation('p1')).toEqual(before);
  });

  it('повторное обнаружение обновляет контакт', () => {
    units().spawnUnit('worker', 1, 1, 'p1');
    const enemy = units().spawnUnit('swordsman', 4, 1, 'p2')!;
    const move = (x: number) =>
      useUnitsStore.setState(state => ({
        units: { ...state.units, [enemy]: { ...state.units[enemy], x } },
      }));

    move(10);
    useGameLoopStore.setState({ currentTurn: 2 });
    move(4);

    expect(getObservation('p1').visibleEnemies[0]).toMatchObject({ x: 4 });
    expect(
      useKnowledgeStore.getState().byParticipant.p1?.contacts[enemy],
    ).toMatchObject({ seenTurn: 2 });
  });
});
