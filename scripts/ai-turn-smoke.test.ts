import { writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '../src/app/game/ai/aiTurn';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { useJournalStore } from '@entities/journals';
import { initializeGame } from '@widgets/start-game';

const fixedSeed = 3;
const rounds = 10;
const outputPath = '/tmp/simplewar-ai-turn-smoke.json';

const captureState = () => {
  const loop = useGameLoopStore.getState();
  const economy = useEconomyStore.getState();
  const units = Object.values(useUnitsStore.getState().units)
    .map(unit => ({
      type: unit.type,
      owner: unit.owner,
      x: unit.x,
      y: unit.y,
      hp: unit.hp,
      actions:
        unit.role === 'civil'
          ? { move: unit.movePoints, build: unit.buildPoints }
          : { move: unit.movePoints, attack: unit.attackPoints },
    }))
    .sort((a, b) =>
      [a.owner, a.type, a.y, a.x]
        .join(':')
        .localeCompare([b.owner, b.type, b.y, b.x].join(':')),
    );
  const buildings = Object.values(useBuildingsStore.getState().buildings)
    .map(building => ({
      type: building.type,
      owner: building.owner,
      x: building.x,
      y: building.y,
      hp: building.hp,
      actions:
        building.role === 'production'
          ? { spawn: building.spawnPoints }
          : building.role === 'combat'
            ? { attack: building.attackPoints }
            : {},
    }))
    .sort((a, b) =>
      [a.owner, a.type, a.y, a.x]
        .join(':')
        .localeCompare([b.owner, b.type, b.y, b.x].join(':')),
    );

  return {
    turn: loop.currentTurn,
    activePlayer: loop.activePlayer,
    phase: loop.phase,
    resources: {
      p1: { ...economy.resources.p1 },
      p2: { ...economy.resources.p2 },
    },
    units,
    buildings,
  };
};

beforeEach(() => {
  resetGame();
  useSettingsStore.setState({
    mapGenerationMode: 'fixed',
    customSeed: fixedSeed,
  });
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  expect(initializeGame()).toBe(true);
  useGameLoopStore.getState().startGame();
});

describe('AI turn simulation smoke', () => {
  it('completes ten real player and AI rounds and saves the turn snapshots', async () => {
    const settings = useSettingsStore.getState();
    const turns: Array<{
      round: number;
      side: 'p1' | 'p2';
      action: string;
      target: null;
      before: ReturnType<typeof captureState>;
      after: ReturnType<typeof captureState>;
    }> = [];

    for (let round = 1; round <= rounds; round++) {
      const playerBefore = captureState();
      expect(playerBefore.activePlayer).toBe('p1');
      nextTurn('p1');
      const playerAfter = captureState();
      expect(playerAfter.activePlayer).toBe('p2');
      turns.push({
        round,
        side: 'p1',
        action: 'skip with nextTurn',
        target: null,
        before: playerBefore,
        after: playerAfter,
      });

      const aiBefore = captureState();
      const result = await runAITurn('p2', {
        yieldControl: () => Promise.resolve(),
      });
      expect(result?.cancelled).toBe(false);
      const aiAfter = captureState();
      expect(aiAfter.activePlayer).toBe('p1');
      expect(aiAfter.turn).toBe(round + 1);
      turns.push({
        round,
        side: 'p2',
        action: `runAITurn: ${result?.commands} commands, ${result?.reason}`,
        target: null,
        before: aiBefore,
        after: aiAfter,
      });
    }

    const finalState = captureState();
    expect(turns).toHaveLength(rounds * 2);
    expect(finalState).toMatchObject({
      turn: rounds + 1,
      activePlayer: 'p1',
      phase: 'inProgress',
      // Пассивный игрок получает только доход ратуши.
      resources: { p1: { gold: 200 + rounds * 3, wood: 120 + rounds * 2 } },
    });
    // ИИ действует сам: развивает экономику и не уходит в минус.
    const decisions = useJournalStore.getState().decisions;
    expect(decisions.some(({ result }) => result === 'ok')).toBe(true);
    expect(finalState.resources.p2.gold).toBeGreaterThanOrEqual(0);
    expect(finalState.resources.p2.wood).toBeGreaterThanOrEqual(0);
    expect(
      finalState.buildings.filter(({ owner }) => owner === 'p2').length,
    ).toBeGreaterThan(1);

    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          settings: {
            rows: settings.gridRows,
            columns: settings.gridColumns,
            mapGenerationMode: 'fixed',
            requestedSeed: fixedSeed,
            acceptedSeed: fixedSeed,
            initializationAttempts: 1,
          },
          roundsRequested: rounds,
          roundsCompleted: rounds,
          playerBehavior: 'skip each turn through nextTurn',
          aiBehavior:
            'runAITurn plans from its own observation and uses shared commands',
          decisions: useJournalStore
            .getState()
            .decisions.map(({ turn, step, ruleId, action, result }) => ({
              turn,
              step,
              ruleId,
              action,
              result,
            })),
          randomness:
            'fixed map seed; generated entity IDs are omitted from snapshots',
          turns,
          summary: finalState,
        },
        null,
        2,
      ),
    );

    expect(useGameLoopStore.getState().currentTurn).toBe(rounds + 1);
  });
});
