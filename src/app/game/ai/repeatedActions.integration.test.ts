import { beforeEach, expect, it, vi } from 'vite-plus/test';
import { AI_CONFIG, type Cell } from '@shared/config';
import { createAiMemory } from '@entities/ai-memories';
import { createUnit, useUnitsStore } from '@entities/units';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { resetGame, initGameLoopEvents } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { playTurn, type AiAction, type AiRule } from '@features/ai';
import { executeAiAction } from './aiTurn';

beforeEach(() => {
  resetGame();
  initGameLoopEvents();
  initVisibilitySystem();
  const grid: Cell[][] = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 12 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p2',
    currentTurn: 1,
  });
  // Фиксированные ID исключают случайность разрешения равных оценок.
  const unit = createUnit('swordsman', 2, 2, 'p2', true)!;
  useUnitsStore.setState({ units: { sword: { ...unit, id: 'sword' } } });
  useUnitsStore.getState().resetUnitsForNewTurn('p2');
  const base = createBuilding('base', 0, 2, 'p2')!;
  useBuildingsStore.setState({ buildings: { home: { ...base, id: 'home' } } });
  useEconomyStore.getState().removeResources('p2', { gold: 200, wood: 120 });
});

/** Реальные команды и наблюдения; конец хода отложен для проверки остатка очков. */
const run = (rules?: AiRule[]) => {
  const actions: AiAction[] = [];
  const points: number[] = [];
  const decisions: Array<{ ruleId: string; action: string; result: string }> =
    [];
  const endTurn = vi.fn();
  const result = playTurn({
    memory: createAiMemory(7),
    observe: () => getObservation('p2'),
    execute: action => {
      const outcome = executeAiAction('p2', action);
      if (outcome.ok) {
        actions.push(action);
        points.push(useUnitsStore.getState().units.sword.movePoints);
      }
      return outcome;
    },
    isCancelled: () => false,
    endTurn,
    record: decision => decisions.push(decision),
    rules,
  });
  return { result, actions, points, decisions, endTurn };
};

const movementRule = (bounce: boolean): AiRule => ({
  id: 'test-move',
  group: 'attack',
  title: 'Проверка повторов',
  evaluate: ctx => {
    const unit = ctx.obs.ownUnits.find(u => u.id === 'sword')!;
    return [
      {
        ruleId: 'test-move',
        group: 'attack',
        actorId: unit.id,
        action: {
          type: 'move',
          unitId: unit.id,
          x: bounce && unit.x === 3 ? 2 : 3,
          y: 2,
        },
        score: 100,
        reason: 'Намеренно повторяем приказ даже после исчерпания очков',
      },
    ];
  },
});

it('искусственное A → B → A ограничено реальными очками, а не done или лимитом команд', async () => {
  const budget = useUnitsStore.getState().units.sword.movePoints;
  const turn = run([movementRule(true)]);
  const result = await turn.result;
  expect(turn.actions.length).toBeGreaterThan(1);
  expect(turn.actions.map(a => a.type === 'move' && a.x)).toEqual(
    Array.from({ length: budget }, (_, i) => (i % 2 === 0 ? 3 : 2)),
  );
  expect(turn.points).toEqual(
    Array.from({ length: budget }, (_, i) => budget - i - 1),
  );
  expect(result.commands).toBe(budget);
  expect(result.commands).toBeLessThan(AI_CONFIG.maxCommandsPerTurn);
  expect(result.reason).toBe('нет законных действий');
  expect(turn.endTurn).toHaveBeenCalledTimes(1);
});

it('повтор успешного приказа в ту же клетку отклоняется и затем исключается', async () => {
  const turn = run([movementRule(false)]);
  expect(await turn.result).toMatchObject({
    commands: 1,
    reason: 'нет законных действий',
  });
  expect(turn.decisions.map(d => d.result)).toEqual([
    'ok',
    'occupied',
    'endTurn',
  ]);
});

it('реальные правила дают одному мечнику move → attack со свежими очками и позицией', async () => {
  const enemy = createUnit('swordsman', 4, 2, 'p1', true)!;
  useUnitsStore.setState(state => ({
    units: { ...state.units, enemy: { ...enemy, id: 'enemy' } },
  }));
  const turn = run();
  const result = await turn.result;
  expect(turn.actions).toEqual([
    { type: 'move', unitId: 'sword', x: 3, y: 2 },
    { type: 'attack', attackerId: 'sword', targetId: 'enemy' },
  ]);
  expect(
    turn.decisions.filter(d => d.result === 'ok').map(d => d.ruleId),
  ).toEqual(['M01', 'M01']);
  expect(useUnitsStore.getState().units.sword).toMatchObject({
    movePoints: 0,
    attackPoints: 0,
  });
  expect(useUnitsStore.getState().units.enemy.hp).toBeLessThan(enemy.hp);
  expect(result.commands).toBe(2);
});

it.each([
  ['swordsman', 1, 3],
  ['swordsman', 1, 4],
  ['swordsman', 1, 5],
  ['swordsman', 110, 3],
  ['swordsman', 110, 4],
  ['swordsman', 110, 5],
  ['archer', 1, 3],
  ['archer', 1, 4],
  ['archer', 1, 5],
  ['archer', 75, 3],
  ['archer', 75, 4],
  ['archer', 75, 5],
] as const)(
  'реальные правила: %s с HP %i, враг x=%i не исчерпывает лимит повторениями',
  async (type, hp, x) => {
    const unit = createUnit(type, 2, 2, 'p2', true)!;
    const enemy = createUnit('swordsman', x, 2, 'p1', true)!;
    useUnitsStore.setState({
      units: {
        sword: { ...unit, id: 'sword', hp },
        enemy: { ...enemy, id: 'enemy' },
      },
    });
    useUnitsStore.getState().resetUnitsForNewTurn('p2');
    const budget = useUnitsStore.getState().units.sword.movePoints;
    const turn = run();
    const result = await turn.result;
    expect(result.commands).toBeLessThan(AI_CONFIG.maxCommandsPerTurn);
    expect(result.reason).not.toBe('предел команд за ход');
    expect(
      turn.actions.filter(a => a.type === 'move').length,
    ).toBeLessThanOrEqual(budget);
    const visited = new Set(['2,2']);
    for (const action of turn.actions) {
      if (action.type !== 'move') continue;
      const key = `${action.x},${action.y}`;
      expect(visited.has(key), JSON.stringify(turn.decisions)).toBe(false);
      visited.add(key);
    }
    let previous = budget;
    for (const points of turn.points) {
      expect(points).toBeLessThan(previous);
      previous = points;
    }
  },
);
