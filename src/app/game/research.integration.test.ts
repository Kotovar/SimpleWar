import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_PARTICIPANTS,
  RESEARCH_CONFIG,
  type ParticipantId,
  type Cell,
} from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useJournalStore } from '@entities/journals';
import { hasResearch, useResearchStore } from '@entities/researches';
import { nextTurn } from '@features/game-loop';
import { cancelResearch, startResearch } from '@features/research';
import { attack } from '@features/combat';
import { build } from '@features/build';
import { assignWorker, clearForest } from '@features/workers';
import { getObservation, refreshKnowledge } from '@features/visibility';
import {
  getParticipantKnowledge,
  useKnowledgeStore,
} from '@entities/perceptions';

const buildings = () => useBuildingsStore.getState();
const research = () => useResearchStore.getState();
const stock = () => useEconomyStore.getState().resources.p1;
const round = () => {
  nextTurn('p1');
  nextTurn('p2');
};

let forge = '';

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useEconomyStore.getState().resetStore();
  useEconomyStore.setState(state => {
    state.resources.p1 = { gold: 1000, wood: 1000 };
  });
  research().resetStore();
  useKnowledgeStore.getState().resetStore();
  useJournalStore.getState().newGame();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    winner: null,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  buildings().spawnBuilding('base', 0, 0, 'p1');
  buildings().spawnBuilding('base', 4, 4, 'p2');
  forge = buildings().spawnBuilding('forge', 1, 0, 'p1')!;
});

describe('исследования', () => {
  it('списывает цену при старте и завершается в конце последнего своего хода', () => {
    const { cost, turns } = RESEARCH_CONFIG.cartography;
    expect(startResearch({ actor: 'p1', research: 'cartography' }).ok).toBe(
      true,
    );
    expect(stock()).toEqual({ gold: 1000 - cost.gold, wood: 1000 - cost.wood });

    // Ход запуска засчитывается.
    for (let i = 1; i < turns; i++) round();
    expect(hasResearch('p1', 'cartography')).toBe(false);
    expect(research().current.p1?.turnsLeft).toBe(1);

    nextTurn('p1');
    expect(hasResearch('p1', 'cartography')).toBe(true);
    expect(research().current.p1).toBeUndefined();
    expect(hasResearch('p2', 'cartography')).toBe(false);
    expect(
      useJournalStore.getState().entries.some(e => e.type === 'researchDone'),
    ).toBe(true);
  });

  it('отклоняет вторую работу, повтор изученного и старт без кузницы', () => {
    expect(startResearch({ actor: 'p1', research: 'formation' }).ok).toBe(true);
    const after = { ...stock() };
    expect(startResearch({ actor: 'p1', research: 'artel' })).toMatchObject({
      code: 'researching',
    });
    expect(stock()).toEqual(after);

    useResearchStore.setState({
      current: {},
      completed: { p1: ['formation'] },
    });
    expect(startResearch({ actor: 'p1', research: 'formation' })).toMatchObject(
      { code: 'researched' },
    );

    buildings().demolishBuilding(forge);
    expect(startResearch({ actor: 'p1', research: 'artel' })).toMatchObject({
      code: 'forge',
    });
  });

  it('не стартует без ресурсов и в чужой ход', () => {
    useEconomyStore.setState(state => {
      state.resources.p1 = { gold: 99, wood: 1000 };
    });
    expect(startResearch({ actor: 'p1', research: 'formation' })).toMatchObject(
      { code: 'resources' },
    );
    expect(startResearch({ actor: 'p2', research: 'formation' })).toMatchObject(
      { code: 'turn' },
    );
    expect(research().current).toEqual({});
  });

  it('без кузницы ставит работу на паузу, новая кузница продолжает', () => {
    startResearch({ actor: 'p1', research: 'formation' });
    round();
    expect(research().current.p1?.turnsLeft).toBe(2);

    buildings().demolishBuilding(forge);
    round();
    round();
    expect(research().current.p1?.turnsLeft).toBe(2);

    buildings().spawnBuilding('forge', 2, 0, 'p1');
    round();
    nextTurn('p1');
    expect(hasResearch('p1', 'formation')).toBe(true);
  });

  it('отмена не возвращает цену', () => {
    startResearch({ actor: 'p1', research: 'formation' });
    const after = { ...stock() };
    expect(cancelResearch('p1').ok).toBe(true);
    expect(research().current.p1).toBeUndefined();
    expect(stock()).toEqual(after);
    expect(cancelResearch('p1')).toMatchObject({ code: 'target' });
  });
});

describe('эффекты исследований', () => {
  const units = () => useUnitsStore.getState();
  const learn = (...done: ('formation' | 'cartography')[]) =>
    useResearchStore.setState({ current: {}, completed: { p1: done } });

  /** Всадник p2 бьёт копейщика p1 в клетке (2, 2); возвращает урон. */
  const riderHit = () => {
    const rider = units().spawnUnit('rider', 3, 2, 'p2', true)!;
    useUnitsStore.setState(state => {
      const unit = state.units[rider];
      if (unit.role === 'military') unit.attackPoints = 1;
    });
    useGameLoopStore.setState({ activePlayer: 'p2' });
    const before = units().units.target.hp;
    expect(
      attack({ actor: 'p2', attackerId: rider, targetId: 'target' }).ok,
    ).toBe(true);
    return before - units().units.target.hp;
  };

  const spawnTarget = () => {
    const id = units().spawnUnit('spearman', 2, 2, 'p1', true)!;
    useUnitsStore.setState(state => {
      state.units.target = { ...state.units[id], id: 'target' };
      delete state.units[id];
    });
  };

  it('Строй действует на уже стоящих копейщиков и не суммируется', () => {
    spawnTarget();
    units().spawnUnit('spearman', 2, 1, 'p1', true);
    units().spawnUnit('spearman', 1, 2, 'p1', true);
    const plain = 24 - 2;
    learn('formation');
    expect(riderHit()).toBe(plain - 2);
  });

  it('Строй не работает по диагонали', () => {
    spawnTarget();
    units().spawnUnit('spearman', 1, 1, 'p1', true);
    learn('formation');
    expect(riderHit()).toBe(22);
  });

  it('без исследования соседний копейщик защиты не даёт', () => {
    spawnTarget();
    units().spawnUnit('spearman', 2, 1, 'p1', true);
    expect(riderHit()).toBe(22);
  });

  it('разведчик помечает замеченный контакт', () => {
    units().spawnUnit('scout', 1, 1, 'p1', true);
    const enemy = units().spawnUnit('swordsman', 3, 1, 'p2', true)!;
    refreshKnowledge();
    expect(getParticipantKnowledge('p1')?.contacts[enemy]?.byScout).toBe(true);
  });
});

describe('Скрытая наводка', () => {
  const units = () => useUnitsStore.getState();
  const marks = (viewer: ParticipantId) => getObservation(viewer).strikes;

  /** Орудие p1 в (0, 4) готовит удар по (3, 4) — рядом с базой p2. */
  const prepare = () => {
    const siege = units().spawnUnit('siege', 0, 4, 'p1', true)!;
    units().setPreparedStrike(siege, { x: 3, y: 4 });
    refreshKnowledge();
    return siege;
  };

  it('без исследования отметку видит враг, с ним — только своя сторона', () => {
    prepare();
    expect(marks('p2')).toEqual([{ x: 3, y: 4 }]);

    useUnitsStore.setState({ units: {} });
    refreshKnowledge();
    useResearchStore.setState({ completed: { p1: ['hiddenAiming'] } });
    prepare();
    expect(marks('p1')).toEqual([{ x: 3, y: 4 }]);
    expect(marks('p2')).toEqual([]);
  });

  it('разведчик врага раскрывает отметку, и она остаётся после его гибели', () => {
    useResearchStore.setState({ completed: { p1: ['hiddenAiming'] } });
    prepare();
    expect(marks('p2')).toEqual([]);

    const scout = units().spawnUnit('scout', 3, 3, 'p2', true)!;
    refreshKnowledge();
    expect(marks('p2')).toEqual([{ x: 3, y: 4 }]);

    units().damageUnit(scout, 1000);
    refreshKnowledge();
    expect(marks('p2')).toEqual([{ x: 3, y: 4 }]);
  });

  it('обычные юниты врага отметку не раскрывают', () => {
    useResearchStore.setState({ completed: { p1: ['hiddenAiming'] } });
    units().spawnUnit('swordsman', 3, 3, 'p2', true);
    prepare();
    expect(marks('p2')).toEqual([]);
  });

  it('при четырёх сторонах отметку открывает только сторона с разведчиком', () => {
    useGameLoopStore.setState({
      participants: (['p1', 'p2', 'p3', 'p4'] as const).map(id => ({
        id,
        controller: 'ai' as const,
      })),
    });
    useResearchStore.setState({ completed: { p1: ['hiddenAiming'] } });
    prepare();
    expect(marks('p2')).toEqual([]);
    expect(marks('p3')).toEqual([]);
    expect(marks('p4')).toEqual([]);

    units().spawnUnit('scout', 3, 3, 'p4', true);
    refreshKnowledge();
    expect(marks('p4')).toEqual([{ x: 3, y: 4 }]);
    expect(marks('p2')).toEqual([]);
    expect(marks('p3')).toEqual([]);
  });

  it('после удара отметка пропадает у всех', () => {
    const siege = prepare();
    units().setPreparedStrike(siege, null);
    refreshKnowledge();
    expect(marks('p1')).toEqual([]);
    expect(marks('p2')).toEqual([]);
  });
});

describe('Артель', () => {
  const units = () => useUnitsStore.getState();

  /** Рабочий p1 внутри рудника в (2, 1); возвращает его ID. */
  const miner = () => {
    const mine = buildings().spawnBuilding('mine', 2, 1, 'p1')!;
    const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;
    expect(
      assignWorker({ actor: 'p1', workerId: worker, buildingId: mine }).ok,
    ).toBe(true);
    return worker;
  };

  const goldAfterTurn = () => {
    const before = stock().gold;
    nextTurn('p1');
    return stock().gold - before;
  };

  it('без Артели стройка из рудника отменяет добычу', () => {
    const worker = miner();
    expect(
      build({ actor: 'p1', workerId: worker, buildingType: 'farm', x: 3, y: 1 })
        .ok,
    ).toBe(true);
    expect(goldAfterTurn()).toBe(3);
  });

  it('с Артелью стройка и добыча в один ход, без двойного дохода', () => {
    useResearchStore.setState({ completed: { p1: ['artel'] } });
    const worker = miner();
    expect(
      build({ actor: 'p1', workerId: worker, buildingType: 'farm', x: 3, y: 1 })
        .ok,
    ).toBe(true);
    expect(goldAfterTurn()).toBe(3 + 15);
  });

  it('с Артелью расчистка леса не мешает добыче', () => {
    useResearchStore.setState({ completed: { p1: ['artel'] } });
    useMapStore.getState().setCell(3, 1, { type: 'forest', isWalkable: false });
    const worker = miner();
    expect(clearForest({ actor: 'p1', workerId: worker, x: 3, y: 1 }).ok).toBe(
      true,
    );
    expect(goldAfterTurn()).toBe(3 + 15);
  });
});

describe('Инженерия: частокол', () => {
  const units = () => useUnitsStore.getState();
  const learn = () =>
    useResearchStore.setState({ completed: { p1: ['engineering'] } });
  const palisade = (worker: string, x: number, y: number) =>
    build({ actor: 'p1', workerId: worker, buildingType: 'palisade', x, y });

  it('без исследования не строится', () => {
    const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;
    expect(palisade(worker, 3, 2)).toMatchObject({ code: 'research' });
    expect(buildings().getBuildingAt(3, 2)).toBeNull();
  });

  it('строится на поле и холме, не на болоте, без обзора и дохода', () => {
    learn();
    const { setCell } = useMapStore.getState();
    setCell(3, 1, { type: 'hill', isWalkable: true });
    setCell(1, 2, { type: 'swamp', isWalkable: true });
    const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;

    expect(palisade(worker, 1, 2)).toMatchObject({ code: 'terrain' });
    expect(palisade(worker, 3, 1).ok).toBe(true);
    const wall = buildings().getBuildingAt(3, 1)!;
    expect(wall).toMatchObject({ role: 'obstacle', owner: 'p1' });
    expect(wall.income).toBeUndefined();
  });

  it('не перекрывает последний выход', () => {
    learn();
    buildings().demolishBuilding(forge);
    // Выход ратуши в (0, 0) — только клетка (1, 0).
    useMapStore.getState().setCell(0, 1, { type: 'water', isWalkable: false });
    useMapStore.getState().setCell(1, 1, { type: 'water', isWalkable: false });
    refreshKnowledge();
    const worker = units().spawnUnit('worker', 2, 0, 'p1', true)!;
    expect(palisade(worker, 1, 0)).toMatchObject({ code: 'blocked' });
  });
});
