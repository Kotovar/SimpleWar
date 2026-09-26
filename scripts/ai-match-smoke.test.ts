import { writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { AI_CONFIG, MAP_PRESETS } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '../src/app/game/ai/aiTurn';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';

/**
 * Партия ИИ против пассивного игрока: игрок штатно пропускает ход, ИИ
 * планирует только по своему наблюдению и действует общими командами.
 * Ожидание — ИИ сам развивает базу, находит игрока и разрушает ратушу.
 *
 * Повтор: `pnpm vp test run scripts/ai-match-smoke.test.ts`.
 */
const seed = 7;
const map = MAP_PRESETS.medium;
const maxRounds = 120;
const outputPath = '/tmp/simplewar-ai-match-smoke.json';

const owned = (owner: 'p1' | 'p2') => ({
  units: Object.values(useUnitsStore.getState().units).filter(
    unit => unit.owner === owner,
  ),
  buildings: Object.values(useBuildingsStore.getState().buildings).filter(
    building => building.owner === owner,
  ),
});

beforeEach(() => {
  resetGame();
  useSettingsStore.setState({
    mapGenerationMode: 'fixed',
    customSeed: seed,
    gridColumns: map.cols,
    gridRows: map.rows,
  });
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  expect(initializeGame()).toBe(true);
  useGameLoopStore.getState().startGame();
});

describe('AI match smoke', () => {
  it('ИИ без полного обзора разрушает ратушу пассивного игрока', async () => {
    const rounds: Array<Record<string, string | number>> = [];
    let completed = 0;

    for (let round = 1; round <= maxRounds; round++) {
      if (useGameLoopStore.getState().phase !== 'inProgress') break;
      nextTurn('p1');

      const result = await runAITurn('p2', {
        yieldControl: () => Promise.resolve(),
      });
      // Ход, в котором ИИ разрушил ратушу, прерывается концом партии.
      const over = useGameLoopStore.getState().phase === 'gameOver';
      expect(result?.cancelled).toBe(over);
      expect(result!.commands).toBeLessThanOrEqual(
        AI_CONFIG.maxCommandsPerTurn,
      );
      const stock = useEconomyStore.getState().resources.p2;
      expect(stock.gold).toBeGreaterThanOrEqual(0);
      expect(stock.wood).toBeGreaterThanOrEqual(0);

      const { units, buildings } = owned('p2');
      rounds.push({
        round,
        commands: result!.commands,
        reason: result!.reason,
        strategy:
          useJournalStore
            .getState()
            .decisions.findLast(d => d.turn === round)
            ?.strategy.slice(0, 3) ?? '',
        gold: stock.gold,
        wood: stock.wood,
        units: units.map(({ type }) => type[0]).join(''),
        buildings: buildings.map(({ type }) => type).join(','),
      });
      completed = round;
    }

    const loop = useGameLoopStore.getState();
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          settings: { seed, columns: map.cols, rows: map.rows, maxRounds },
          playerBehavior: 'skip each turn through nextTurn',
          result: { phase: loop.phase, winner: loop.winner, completed },
          rounds,
        },
        null,
        2,
      ),
    );

    expect(loop).toMatchObject({ phase: 'gameOver', winner: 'p2' });
    expect(owned('p1').buildings.some(({ type }) => type === 'base')).toBe(
      false,
    );
    expect(completed).toBeLessThan(maxRounds);
  }, 120_000);
});
