import { writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { MAP_PRESETS, type SandboxScenario } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '../src/app/game/ai/aiTurn';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { initGameLoopEvents, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initBattleStats, useSandboxStore } from '@features/sandbox';
import { initializeSandbox } from '@widgets/start-game';

/**
 * Замер S15b без браузера: длительность хода ИИ и самая длинная непрерывная
 * порция вычислений между отдачами управления на больших картах. Порция —
 * время от возврата управления ИИ до следующего вызова `yieldControl`.
 * Числа зависят от машины; сравнивать прогоны на одной.
 *
 * Замер, а не проверка: в `pnpm test` пропускается.
 * Повтор: `AI_TIMING=1 pnpm vp test run scripts/ai-turn-timing.test.ts`
 * (сид — `TIMING_SEED`, по умолчанию 7).
 */
const army = {
  swordsman: 6,
  archer: 4,
  spearman: 2,
  rider: 2,
  siege: 1,
  mage: 1,
  healer: 1,
  griffon: 1,
};
const scenario: SandboxScenario = {
  emptyField: false,
  sides: [
    {
      controller: 'ai',
      units: army,
      buildings: { barracks: 2, farm: 3, stable: 1, sanctuary: 1 },
      stock: { gold: 800, wood: 800 },
    },
    {
      controller: 'ai',
      units: army,
      buildings: { barracks: 2, farm: 3, stable: 1, sanctuary: 1 },
      stock: { gold: 800, wood: 800 },
    },
  ],
};
const maps = { extra: MAP_PRESETS.extra, huge: MAP_PRESETS.huge };
const seed = Number(process.env.TIMING_SEED ?? 7);
const rounds = 8;
const outputPath = '/tmp/simplewar-ai-turn-timing.json';

beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  initBattleStats();
});

type TurnTiming = { total: number; longestChunk: number; yields: number };

const measure = async (map: { cols: number; rows: number }) => {
  resetGame();
  useSettingsStore.setState({
    mapGenerationMode: 'fixed',
    customSeed: seed,
    gridColumns: map.cols,
    gridRows: map.rows,
  });
  useSandboxStore.setState({ enabled: true, paused: false, scenario });
  const started = initializeSandbox(scenario);
  expect(started).not.toBeNull();
  useGameLoopStore.getState().startGame(started!.participants);

  const turns: TurnTiming[] = [];
  for (let i = 0; i < rounds * 2; i++) {
    const loop = useGameLoopStore.getState();
    if (loop.phase !== 'inProgress') break;
    const timing: TurnTiming = { total: 0, longestChunk: 0, yields: 0 };
    const start = performance.now();
    let resumed = start;
    await runAITurn(loop.activePlayer, {
      yieldControl: async () => {
        timing.longestChunk = Math.max(
          timing.longestChunk,
          performance.now() - resumed,
        );
        timing.yields++;
        await Promise.resolve();
        resumed = performance.now();
      },
    });
    const end = performance.now();
    timing.longestChunk = Math.max(timing.longestChunk, end - resumed);
    timing.total = end - start;
    turns.push(timing);
  }
  const max = (key: keyof TurnTiming) =>
    Math.round(Math.max(...turns.map(turn => turn[key])));
  return {
    map: `${map.cols}x${map.rows}`,
    turns: turns.length,
    maxTurnMs: max('total'),
    avgTurnMs: Math.round(
      turns.reduce((sum, turn) => sum + turn.total, 0) / turns.length,
    ),
    maxChunkMs: max('longestChunk'),
  };
};

describe.skipIf(!process.env.AI_TIMING)('ai turn timing', () => {
  it('замер длительности хода и порций на больших картах', async () => {
    const results = [];
    for (const map of Object.values(maps)) results.push(await measure(map));
    writeFileSync(
      outputPath,
      JSON.stringify({ seed, rounds, results }, null, 2),
    );
    console.table(results);
    for (const result of results) expect(result.turns).toBeGreaterThan(0);
  }, 600_000);
});
