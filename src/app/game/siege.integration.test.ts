import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_PARTICIPANTS,
  type Cell,
  type Participant,
} from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { getVisibleRecords, useJournalStore } from '@entities/journals';
import { attack, prepareStrike } from '@features/combat';
import { initGameLoopEvents, nextTurn, surrender } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { initJournalSystem, initPopulationSystem } from '@app/system';

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

  it.each([
    { x: 5, y: 2 },
    { x: 4, y: 3 },
  ])(
    'уничтоженная предыдущим ударом машина не бьёт в $x,$y и не меняет журнал',
    cell => {
      start(THREE);
      const first = siegeAt(1, 2);
      const second = siegeAt(3, 2);
      units().damageUnit(second, units().units[second].hp - 1);
      const target = units().spawnUnit('worker', 5, 2, 'p2')!;
      expect(prepareStrike({ actor: 'p1', unitId: first, x: 3, y: 2 }).ok).toBe(
        true,
      );
      expect(prepareStrike({ actor: 'p1', unitId: second, ...cell }).ok).toBe(
        true,
      );

      round();

      expect(units().units[second]).toBeUndefined();
      expect.soft(hp(target)).toBe(25);
      expect.soft(useMapStore.getState().getCell(4, 3)?.type).toBe('forest');
      expect
        .soft(
          useJournalStore.getState().entries.filter(e => e.type === 'strike'),
        )
        .toEqual([
          expect.objectContaining({
            details: expect.objectContaining({ x: 3, y: 2 }),
          }),
        ]);
    },
  );

  it.each(['nextTurn', 'surrender'] as const)(
    '%s: очки юнитов и зданий восстановлены уже в момент удара нового игрока',
    transition => {
      start(THREE.map(p => ({ ...p, controller: 'human' })));
      const siege = units().spawnUnit('siege', 1, 2, 'p2')!;
      units().setPreparedStrike(siege, { x: 4, y: 2 });
      const tower = buildings().spawnBuilding('tower', 2, 4, 'p2')!;
      buildings().changeAttackPoints(tower);
      const target = units().spawnUnit('worker', 4, 2, 'p3')!;
      units().damageUnit(target, 24);
      const atStrike: unknown[] = [];
      const unsubscribe = gameEvents.subscribe(event => {
        if (event.type !== 'UNIT_DESTROYED' || event.unit.id !== target) return;
        atStrike.push({
          unit: units().units[siege],
          building: buildings().buildings[tower],
          activePlayer: useGameLoopStore.getState().activePlayer,
        });
      });
      try {
        expect(
          (transition === 'nextTurn' ? nextTurn : surrender)('p1').ok,
        ).toBe(true);
      } finally {
        unsubscribe();
      }

      expect(hp(target)).toBeUndefined();
      expect(atStrike).toEqual([
        {
          unit: expect.objectContaining({
            movePoints: units().units[siege].maxMovePoints,
            attackPoints: 1,
            preparedStrike: null,
          }),
          building: expect.objectContaining({ attackPoints: 1 }),
          activePlayer: 'p2',
        },
      ]);
      expect(
        useJournalStore.getState().entries.filter(e => e.type === 'strike'),
      ).toHaveLength(1);
      nextTurn('p2');
      nextTurn('p3');
      if (transition === 'nextTurn') nextTurn('p1');
      expect(
        useJournalStore.getState().entries.filter(e => e.type === 'strike'),
      ).toHaveLength(1);
    },
  );

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

  it.each(['unit', 'building'] as const)(
    'удар вне обзора не раскрывает скрытый %s в журнале',
    kind => {
      initJournalSystem();
      start(THREE);
      const siege = siegeAt(1, 2);
      const target =
        kind === 'unit'
          ? units().spawnUnit('worker', 5, 2, 'p2')!
          : buildings().spawnBuilding('farm', 5, 2, 'p2')!;
      if (kind === 'unit') units().damageUnit(target, 24);
      else
        buildings().damageBuilding(
          target,
          buildings().buildings[target].hp - 1,
        );
      expect(prepareStrike({ actor: 'p1', unitId: siege, x: 5, y: 2 }).ok).toBe(
        true,
      );
      // Разведчик уходит: цель остаётся разведанной, но больше не видна осаде.
      const scout = Object.values(units().units).find(u => u.type === 'scout')!;
      units().placeUnit(scout.id, 0, 5);
      expect(getObservation('p1').visible[2][5]).toBe(false);
      useJournalStore.getState().newGame();

      round();

      expect(
        kind === 'unit' ? units().units[target] : buildings().buildings[target],
      ).toBeUndefined();
      const mine = getVisibleRecords(useJournalStore.getState().entries, 'p1');
      expect
        .soft(mine.filter(e => e.type === 'strike'))
        .toMatchObject([{ details: { x: 5, y: 2, hits: 'вне обзора' } }]);
      expect
        .soft(
          mine.some(
            e => e.type === 'unitDestroyed' || e.type === 'buildingDestroyed',
          ),
        )
        .toBe(false);
      expect(
        getVisibleRecords(useJournalStore.getState().entries, 'p2').some(
          e =>
            e.type ===
            (kind === 'unit' ? 'unitDestroyed' : 'buildingDestroyed'),
        ),
      ).toBe(true);
    },
  );

  it('видимая клетка здания не раскрывает поражённого рабочего внутри', () => {
    initJournalSystem();
    start(THREE);
    const siege = siegeAt(1, 2);
    const mine = buildings().spawnBuilding('mine', 3, 2, 'p2')!;
    const worker = units().spawnUnit('worker', 3, 2, 'p2')!;
    units().setWorkplace(worker, mine);
    units().damageUnit(worker, 24);
    expect(getObservation('p1').visibleEnemies.some(e => e.id === worker)).toBe(
      false,
    );
    expect(prepareStrike({ actor: 'p1', unitId: siege, x: 3, y: 2 }).ok).toBe(
      true,
    );
    useJournalStore.getState().newGame();

    round();

    expect(units().units[worker]).toBeUndefined();
    const mineEntries = getVisibleRecords(
      useJournalStore.getState().entries,
      'p1',
    );
    expect
      .soft(mineEntries.filter(e => e.type === 'strike'))
      .toMatchObject([{ details: { hits: 'mine:52' } }]);
    expect.soft(mineEntries.some(e => e.type === 'unitDestroyed')).toBe(false);
    expect(
      getVisibleRecords(useJournalStore.getState().entries, 'p2').some(
        e => e.type === 'unitDestroyed',
      ),
    ).toBe(true);
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
