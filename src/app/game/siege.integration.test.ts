import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_PARTICIPANTS,
  type Cell,
  type Participant,
} from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useJournalStore } from '@entities/journals';
import { attack, prepareStrike } from '@features/combat';
import { initGameLoopEvents, nextTurn } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const hp = (id: string) => units().units[id]?.hp;

const THREE: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
];

const start = (participants: Participant[]) => {
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    winner: null,
    participants,
    eliminated: [],
  });
  buildings().spawnBuilding('base', 0, 0, 'p1');
  buildings().spawnBuilding('base', 11, 5, 'p2');
  if (participants.length > 2) buildings().spawnBuilding('base', 11, 0, 'p3');
  // Разведчик открывает середину карты: целиться можно только в разведанное.
  units().spawnUnit('scout', 6, 0, 'p1');
};

/** Своё орудие с боевым действием. */
const siegeAt = (x: number, y: number) => {
  const id = units().spawnUnit('siege', x, y, 'p1', true)!;
  useUnitsStore.setState(state => ({
    units: { ...state.units, [id]: { ...state.units[id], attackPoints: 1 } },
  }));
  return id;
};

/** Полный круг до начала следующего хода `p1`. */
const round = (participants = THREE) => {
  for (const { id } of participants) nextTurn(id);
};

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useKnowledgeStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
  useJournalStore.getState().newGame();
  const grid: Cell[][] = Array.from({ length: 6 }, (_, y) =>
    Array.from({ length: 12 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  grid[3][4] = { x: 4, y: 3, type: 'forest', isWalkable: false };
  useMapStore.setState({ grid });
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});

describe('подготовленный удар осады', () => {
  it('исполняется в начале следующего хода владельца, один раз, при трёх сторонах', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    const target = units().spawnUnit('swordsman', 4, 2, 'p2')!;

    expect(prepareStrike({ actor: 'p1', unitId: siege, x: 4, y: 2 }).ok).toBe(
      true,
    );
    nextTurn('p1');
    expect(hp(target)).toBe(110);
    nextTurn('p2');
    expect(hp(target)).toBe(110);
    nextTurn('p3');
    expect(hp(target)).toBe(110 - 12);
    expect(units().units[siege]).toMatchObject({ preparedStrike: null });

    round();
    expect(hp(target)).toBe(110 - 12);
  });

  it('цель, ушедшая с клетки, урона не получает', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    const target = units().spawnUnit('swordsman', 4, 2, 'p2')!;
    prepareStrike({ actor: 'p1', unitId: siege, x: 4, y: 2 });

    nextTurn('p1');
    units().placeUnit(target, 5, 2);
    nextTurn('p2');
    nextTurn('p3');

    expect(hp(target)).toBe(110);
  });

  it('бьёт всё на клетке, включая своих; лес становится полем', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    const own = units().spawnUnit('worker', 3, 2, 'p1')!;
    const second = siegeAt(1, 3);
    prepareStrike({ actor: 'p1', unitId: siege, x: 3, y: 2 });
    prepareStrike({ actor: 'p1', unitId: second, x: 4, y: 3 });

    round();

    expect(hp(own)).toBe(25 - 12);
    expect(useMapStore.getState().getCell(4, 3)?.type).toBe('grass');
  });

  it('по зданию бьёт с бонусом против зданий', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    const barracks = buildings().spawnBuilding('barracks', 4, 2, 'p2')!;
    prepareStrike({ actor: 'p1', unitId: siege, x: 4, y: 2 });

    round();

    expect(buildings().buildings[barracks].hp).toBe(150 - 52);
  });

  it('отметку видят все, орудие не раскрывается; гибель орудия снимает её', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    prepareStrike({ actor: 'p1', unitId: siege, x: 4, y: 2 });
    const target = units().spawnUnit('swordsman', 4, 2, 'p2')!;

    const far = getObservation('p3');
    expect(far.strikes).toEqual([{ x: 4, y: 2 }]);
    expect(far.visibleEnemies.some(({ type }) => type === 'siege')).toBe(false);

    units().damageUnit(siege, 1000);
    expect(getObservation('p2').strikes).toEqual([]);
    round();
    expect(hp(target)).toBe(110);
  });

  it('удар может завершить партию', () => {
    start(DEFAULT_PARTICIPANTS);
    const siege = siegeAt(9, 5);
    const base = buildings().getBuildingAt(11, 5)!;
    buildings().damageBuilding(base.id, base.hp - 10);
    prepareStrike({ actor: 'p1', unitId: siege, x: 11, y: 5 });

    round(DEFAULT_PARTICIPANTS);

    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'gameOver',
      winner: 'p1',
    });
  });

  it('отклоняет неверную дальность, неразведанную клетку, чужой тип и повтор', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    const sword = units().spawnUnit('swordsman', 3, 0, 'p1', true)!;
    const code = (x: number, y: number, unitId = siege) =>
      prepareStrike({ actor: 'p1', unitId, x, y });

    expect(code(2, 2)).toMatchObject({ code: 'distance' });
    expect(code(7, 2)).toMatchObject({ code: 'distance' });
    expect(code(0, 5)).toMatchObject({ code: 'hidden' });
    expect(code(3, 4, sword)).toMatchObject({ code: 'actionType' });
    expect(code(3, 2).ok).toBe(true);
    expect(code(3, 3)).toMatchObject({ code: 'points' });
  });

  it('прямой атакой осада не бьёт', () => {
    start(THREE);
    const siege = siegeAt(1, 2);
    const enemy = units().spawnUnit('swordsman', 1, 3, 'p2')!;

    expect(
      attack({ actor: 'p1', attackerId: siege, targetId: enemy }),
    ).toMatchObject({ code: 'actionType' });
  });
});
