import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell, type CellType } from '@shared/config';
import { getSightRadius } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useJournalStore } from '@entities/journals';
import { attack, heal, prepareStrike } from '@features/combat';
import { move } from '@features/pathfinding';
import { initGameLoopEvents, nextTurn } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initPopulationSystem } from '@app/system';

const units = () => useUnitsStore.getState();
const unit = (id: string) => units().units[id];

/** Юнит с восстановленными очками движения и действия. */
const ready = (
  type: Parameters<ReturnType<typeof units>['spawnUnit']>[0],
  x: number,
  y: number,
  owner: 'p1' | 'p2' = 'p1',
) => {
  const id = units().spawnUnit(type, x, y, owner, true)!;
  useUnitsStore.setState(state => {
    const current = state.units[id];
    return {
      units: {
        ...state.units,
        [id]:
          current.role === 'military'
            ? { ...current, attackPoints: current.maxAttackPoints }
            : current,
      },
    };
  });
  return id;
};

const wound = (id: string, hp: number) =>
  useUnitsStore.setState(state => ({
    units: { ...state.units, [id]: { ...state.units[id], hp } },
  }));

/** Карта 10×5: поле, столбец воды x = 4 — «берег — вода — берег». */
const setMap = (special: [number, number, CellType][] = []) => {
  const grid: Cell[][] = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({
      x,
      y,
      type: x === 4 ? 'water' : 'grass',
      isWalkable: x !== 4,
    })),
  );
  for (const [x, y, type] of special) {
    grid[y][x] = { x, y, type, isWalkable: false };
  }
  useMapStore.setState({ grid });
};

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useKnowledgeStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
  useJournalStore.getState().newGame();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    winner: null,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  setMap();
  useBuildingsStore.getState().spawnBuilding('base', 0, 0, 'p1');
  useBuildingsStore.getState().spawnBuilding('base', 9, 4, 'p2');
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});

describe('лечение', () => {
  it('лечит своего раненого не выше максимума и тратит действие', () => {
    const healer = ready('healer', 1, 2);
    const hurt = ready('swordsman', 2, 2);
    wound(hurt, 100);

    expect(heal({ actor: 'p1', healerId: healer, targetId: hurt }).ok).toBe(
      true,
    );
    expect(unit(hurt).hp).toBe(110);
    expect(unit(healer)).toMatchObject({ attackPoints: 0, movePoints: 0 });
    // Второе лечение в тот же ход — нет действия.
    wound(hurt, 50);
    expect(
      heal({ actor: 'p1', healerId: healer, targetId: hurt }),
    ).toMatchObject({ code: 'points' });
  });

  it('отказывает без расхода: полное HP, чужой, погибший, далёкий', () => {
    const healer = ready('healer', 1, 2);
    const full = ready('swordsman', 2, 2);
    const enemy = ready('swordsman', 1, 3, 'p2');
    const far = ready('swordsman', 3, 4);
    wound(enemy, 10);
    wound(far, 10);
    const tryHeal = (targetId: string) =>
      heal({ actor: 'p1', healerId: healer, targetId });

    expect(tryHeal(full)).toMatchObject({ code: 'target' });
    expect(tryHeal(enemy)).toMatchObject({ code: 'target' });
    expect(tryHeal('unit_dead')).toMatchObject({ code: 'notFound' });
    expect(tryHeal(far)).toMatchObject({ code: 'distance' });
    expect(unit(healer)).toMatchObject({ attackPoints: 1 });
  });

  it('лечение после перемещения разрешено; лекарь не атакует, маг не лечит', () => {
    const healer = ready('healer', 1, 2);
    const hurt = ready('swordsman', 3, 3);
    const mage = ready('mage', 1, 1);
    const enemy = ready('swordsman', 1, 3, 'p2');
    wound(hurt, 60);

    expect(move({ actor: 'p1', unitId: healer, x: 2, y: 3 }).ok).toBe(true);
    expect(
      attack({ actor: 'p1', attackerId: healer, targetId: enemy }),
    ).toMatchObject({ code: 'actionType' });
    expect(heal({ actor: 'p1', healerId: mage, targetId: hurt })).toMatchObject(
      { code: 'actionType' },
    );
    expect(heal({ actor: 'p1', healerId: healer, targetId: hurt }).ok).toBe(
      true,
    );
    expect(unit(hurt).hp).toBe(80);
  });

  it('маг бьёт магией: броня копейщика не помогает', () => {
    const mage = ready('mage', 1, 2);
    const spear = ready('spearman', 3, 2, 'p2');

    attack({ actor: 'p1', attackerId: mage, targetId: spear });

    expect(unit(spear).hp).toBe(100 - 20);
  });
});

describe('полёт', () => {
  it('наземный не переходит воду, грифон перелетает и может сесть на воду', () => {
    const sword = ready('swordsman', 3, 2);
    const griffon = ready('griffon', 3, 1);

    expect(move({ actor: 'p1', unitId: sword, x: 5, y: 2 })).toMatchObject({
      ok: false,
    });
    expect(move({ actor: 'p1', unitId: griffon, x: 5, y: 1 }).ok).toBe(true);
    expect(unit(griffon)).toMatchObject({ x: 5, y: 1, movePoints: 3 });
    expect(move({ actor: 'p1', unitId: griffon, x: 4, y: 1 }).ok).toBe(true);
    expect(unit(griffon)).toMatchObject({ x: 4, y: 1 });
  });

  it('пролетает над занятой клеткой, но не садится на неё', () => {
    const griffon = ready('griffon', 1, 2);
    const blocker = ready('swordsman', 2, 2);

    expect(move({ actor: 'p1', unitId: griffon, x: 2, y: 2 })).toMatchObject({
      code: 'occupied',
    });
    expect(move({ actor: 'p1', unitId: griffon, x: 3, y: 2 }).ok).toBe(true);
    expect(unit(griffon)).toMatchObject({ x: 3, y: 2, movePoints: 3 });
    expect(unit(blocker)).toMatchObject({ x: 2, y: 2 });
  });

  it('скрытая занятость цели: садится на последней свободной клетке', () => {
    const griffon = ready('griffon', 1, 0);
    // Враг за пределами обзора грифона (4) и ратуши (4).
    ready('scout', 6, 0, 'p2');

    expect(move({ actor: 'p1', unitId: griffon, x: 6, y: 0 }).ok).toBe(true);
    const landed = unit(griffon);
    expect(landed.x).toBeLessThan(6);
    expect(landed.movePoints).toBe(5 - (landed.x - 1));
  });

  it('граница карты и запас очков', () => {
    const griffon = ready('griffon', 1, 2);

    expect(move({ actor: 'p1', unitId: griffon, x: 10, y: 2 })).toMatchObject({
      code: 'bounds',
    });
    expect(move({ actor: 'p1', unitId: griffon, x: 7, y: 2 })).toMatchObject({
      code: 'points',
    });
  });

  it('воздух бьют лучник и маг, мечник — нет', () => {
    const griffon = ready('griffon', 5, 2, 'p2');
    const sword = ready('swordsman', 6, 2);
    const archer = ready('archer', 7, 2);

    expect(
      attack({ actor: 'p1', attackerId: sword, targetId: griffon }),
    ).toMatchObject({ code: 'target' });
    expect(
      attack({ actor: 'p1', attackerId: archer, targetId: griffon }).ok,
    ).toBe(true);
    expect(unit(griffon).hp).toBe(85 - 27);
  });

  it('удар осады не задевает летающего', () => {
    const siege = ready('siege', 1, 2);
    const griffon = ready('griffon', 3, 2, 'p2');
    prepareStrike({ actor: 'p1', unitId: siege, x: 3, y: 2 });

    nextTurn('p1');
    nextTurn('p2');

    expect(unit(griffon).hp).toBe(85);
  });

  it('на холме летающий не получает бонус обзора', () => {
    setMap([[2, 2, 'hill']]);
    const grid = useMapStore.getState().grid;
    const griffon = { ...unit(ready('griffon', 2, 2)) };
    const sword = { ...griffon, type: 'swordsman' as const };

    expect(getSightRadius(griffon, grid)).toBe(4);
    expect(getSightRadius(sword, grid)).toBe(5);
  });
});
