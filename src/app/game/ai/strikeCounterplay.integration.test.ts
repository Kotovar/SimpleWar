import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Cell, Participant, Position } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { createAiMemory } from '@entities/ai-memories';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useUnitsStore } from '@entities/units';
import { buildContext, createTurnState, decideStep } from '@features/ai';
import { prepareStrike } from '@features/combat';
import { initGameLoopEvents, nextTurn } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { runAITurn } from './aiTurn';

const TWO: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
];

const units = () => useUnitsStore.getState();

/**
 * Мир: орудие `p1` вне обзора `p2` готовит удар по мечнику `p2`.
 * Отличается только позиция скрытого орудия.
 */
const world = (gun: Position) => {
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
  useMapStore.setState({ grid, seed: 1 });
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    winner: null,
    participants: TWO,
    eliminated: [],
  });
  useBuildingsStore.getState().spawnBuilding('base', 0, 0, 'p1');
  useBuildingsStore.getState().spawnBuilding('base', 11, 5, 'p2');
  // Разведчик `p1` открывает клетку цели и сам не виден `p2`.
  units().spawnUnit('scout', 6, 0, 'p1');
  const sword = units().spawnUnit('swordsman', 8, 2, 'p2')!;
  const siege = units().spawnUnit('siege', gun.x, gun.y, 'p1', true)!;
  useUnitsStore.setState(state => ({
    units: {
      ...state.units,
      [siege]: { ...state.units[siege], attackPoints: 1 },
    },
  }));
  expect(prepareStrike({ actor: 'p1', unitId: siege, x: 8, y: 2 }).ok).toBe(
    true,
  );
  nextTurn('p1');
  return sword;
};

/** Решение `p2` по его наблюдению без ID: их генерирует мир. */
const decide = () => {
  const obs = getObservation('p2');
  const ctx = buildContext(obs, createAiMemory(7), createTurnState());
  const { chosen, alternatives } = decideStep(ctx);
  return {
    strikes: obs.strikes,
    enemies: obs.visibleEnemies.length,
    ruleIds: [chosen, ...alternatives].map(c => c?.ruleId),
    cells: [chosen, ...alternatives].map(c =>
      c && 'x' in c.action ? { x: c.action.x, y: c.action.y } : null,
    ),
  };
};

beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});

describe('контригра подготовленному удару', () => {
  it('решение одинаково в мирах с разными скрытыми орудиями', () => {
    world({ x: 5, y: 1 });
    const first = decide();
    world({ x: 6, y: 4 });
    const second = decide();

    expect(first.enemies).toBe(0);
    expect(first.strikes).toEqual([{ x: 8, y: 2 }]);
    expect(first.ruleIds).toContain('X02');
    expect(second).toEqual(first);
  });

  it('мечник уходит с отметки, и удар приходится по пустой клетке', async () => {
    const sword = world({ x: 5, y: 1 });

    await runAITurn('p2', { yieldControl: () => Promise.resolve() });

    const unit = units().units[sword];
    expect(unit.x !== 8 || unit.y !== 2).toBe(true);
    expect(useGameLoopStore.getState().activePlayer).toBe('p1');
    // Удар исполнен в начале хода `p1`: отметка снята, мечник цел.
    expect(getObservation('p2').strikes).toEqual([]);
    expect(unit.hp).toBe(unit.maxHp);
  });
});
