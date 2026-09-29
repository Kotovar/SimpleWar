import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_SANDBOX, type SandboxScenario } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import {
  collectReport,
  initBattleStats,
  useSandboxStore,
} from '@features/sandbox';
import { initializeSandbox } from '@widgets/start-game';
import { runAITurn } from './ai/aiTurn';

const scenario: SandboxScenario = {
  emptyField: true,
  sides: [
    {
      controller: 'passive',
      units: { swordsman: 2, griffon: 1 },
      buildings: { farm: 1 },
      stock: { gold: 999, wood: 50 },
    },
    {
      controller: 'ai',
      units: { archer: 3 },
      buildings: {},
      stock: { gold: 10, wood: 20 },
    },
  ],
};

const owned = (owner: string) =>
  [
    ...Object.values(useUnitsStore.getState().units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ]
    .filter(entity => entity.owner === owner)
    .map(({ type }) => type)
    .sort();

beforeEach(() => {
  resetGame();
  useSettingsStore.setState({
    mapGenerationMode: 'fixed',
    customSeed: 5,
    gridColumns: 16,
    gridRows: 16,
  });
  useSandboxStore.setState({ enabled: true, scenario });
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  initBattleStats();
});

describe('режим тестирования баланса', () => {
  it('ставит составы, запасы и управление сторон', () => {
    const started = initializeSandbox(scenario)!;
    useGameLoopStore.getState().startGame(started.participants);

    expect(started.participants).toEqual([
      { id: 'p1', controller: 'passive' },
      { id: 'p2', controller: 'ai' },
    ]);
    expect(owned('p1')).toEqual(
      ['base', 'farm', 'griffon', 'swordsman', 'swordsman', 'worker'].sort(),
    );
    expect(owned('p2')).toEqual([
      'archer',
      'archer',
      'archer',
      'base',
      'worker',
    ]);
    expect(useEconomyStore.getState().resources.p1).toEqual({
      gold: 999,
      wood: 50,
    });
    expect(started.skipped).toEqual([]);
  });

  it('пустое поле — карта без рельефа, кроме стартовых ресурсов', () => {
    initializeSandbox(scenario);
    const { grid } = useMapStore.getState();
    const types = new Set(grid.flat().map(({ type }) => type));

    expect([...types].sort()).toEqual(['forest', 'gold', 'grass']);
  });

  it('некорректный сценарий не стартует и объясняет причину', () => {
    const bad: SandboxScenario = {
      ...DEFAULT_SANDBOX,
      sides: [
        { ...DEFAULT_SANDBOX.sides[0], controller: 'human' },
        { ...DEFAULT_SANDBOX.sides[1], controller: 'human' },
      ],
    };

    expect(initializeSandbox(bad)).toBeNull();
    expect(useGameLoopStore.getState().startError).toMatch(/одна сторона/);
    expect(useGameLoopStore.getState().phase).toBe('setup');
  });

  it('итог считает потери и полученный урон по типам', () => {
    const started = initializeSandbox(scenario)!;
    useGameLoopStore.getState().startGame(started.participants);
    const [archer] = Object.values(useUnitsStore.getState().units).filter(
      ({ type }) => type === 'archer',
    );
    useUnitsStore.getState().damageUnit(archer.id, 20);
    useUnitsStore.getState().damageUnit(archer.id, 100);

    const p2 = collectReport().sides.find(({ id }) => id === 'p2')!;
    expect(p2.losses).toEqual({ archer: 1 });
    expect(p2.damage).toEqual({ archer: archer.maxHp });
    expect(p2.alive.archer).toBe(2);
  });

  it('пассивная сторона ходит штатной сменой хода, итог сбрасывается с партией', () => {
    const started = initializeSandbox(scenario)!;
    useGameLoopStore.getState().startGame(started.participants);
    nextTurn('p1');

    expect(useGameLoopStore.getState().activePlayer).toBe('p2');
    const [archer] = Object.values(useUnitsStore.getState().units).filter(
      ({ type }) => type === 'archer',
    );
    useUnitsStore.getState().damageUnit(archer.id, 5);
    resetGame();

    expect(useSandboxStore.getState().stats).toEqual({});
  });

  it('первая сторона начинает с очками атаки', () => {
    const started = initializeSandbox(scenario)!;
    useGameLoopStore.getState().startGame(started.participants);
    const sword = Object.values(useUnitsStore.getState().units).find(
      ({ owner, type }) => owner === 'p1' && type === 'swordsman',
    )!;

    expect(sword.role === 'military' && sword.attackPoints).toBe(1);
  });

  it('снос своего здания — не потеря и не урон', () => {
    const started = initializeSandbox(scenario)!;
    useGameLoopStore.getState().startGame(started.participants);
    const farm = Object.values(useBuildingsStore.getState().buildings).find(
      ({ type }) => type === 'farm',
    )!;
    useBuildingsStore.getState().demolishBuilding(farm.id);

    expect(useSandboxStore.getState().stats.p1).toBeUndefined();
  });

  it('пауза останавливает идущий ход ИИ, не передавая ход', async () => {
    const started = initializeSandbox({
      ...scenario,
      sides: [scenario.sides[1], scenario.sides[0]],
    })!;
    useGameLoopStore.getState().startGame(started.participants);
    useSandboxStore.setState({ paused: false });

    // «Пауза» нажата после первого решения ИИ — посреди хода.
    const off = useJournalStore.subscribe(state => {
      if (state.decisions.length) useSandboxStore.setState({ paused: true });
    });
    const result = await runAITurn('p1', {
      yieldControl: () => Promise.resolve(),
    });
    off();

    expect(result?.cancelled).toBe(true);
    expect(useGameLoopStore.getState().activePlayer).toBe('p1');
  });

  it('второй запуск того же хода ИИ не начинается', async () => {
    const started = initializeSandbox({
      ...scenario,
      sides: [scenario.sides[1], scenario.sides[0]],
    })!;
    useGameLoopStore.getState().startGame(started.participants);
    useSandboxStore.setState({ paused: false });

    const [first, second] = await Promise.all([
      runAITurn('p1', { yieldControl: () => Promise.resolve() }),
      runAITurn('p1', { yieldControl: () => Promise.resolve() }),
    ]);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});
