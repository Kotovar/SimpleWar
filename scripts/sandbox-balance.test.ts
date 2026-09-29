import { writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { AI_CONFIG, MAP_PRESETS, type SandboxScenario } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '../src/app/game/ai/aiTurn';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import {
  collectReport,
  initBattleStats,
  useSandboxStore,
  type BattleReport,
} from '@features/sandbox';
import { initializeSandbox } from '@widgets/start-game';

/**
 * Прогон баланса S15a без браузера: один сценарий по списку сидов, итог
 * каждого боя в JSON. Тот же сценарий, что в режиме «Тестирование баланса».
 * Меняй `scenario`, `seeds`, `maxRounds` и сравнивай файлы до/после правки.
 *
 * Повтор: `pnpm vp test run scripts/sandbox-balance.test.ts`.
 */
const scenario: SandboxScenario = {
  emptyField: true,
  sides: [
    {
      controller: 'ai',
      units: { swordsman: 4, archer: 2, spearman: 2 },
      buildings: { barracks: 1, farm: 2 },
      stock: { gold: 400, wood: 400 },
    },
    {
      controller: 'ai',
      units: { swordsman: 2, rider: 3, healer: 1 },
      buildings: { barracks: 1, stable: 1, farm: 2 },
      stock: { gold: 400, wood: 400 },
    },
  ],
};
const seeds = [1, 2, 3];
const map = MAP_PRESETS.small;
const maxRounds = 60;
const outputPath = '/tmp/simplewar-sandbox-balance.json';

beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  initBattleStats();
});

/** Один бой: ходы по управлению сторон до конца партии или лимита. */
const fight = async (seed: number): Promise<BattleReport> => {
  resetGame();
  useSettingsStore.setState({
    mapGenerationMode: 'fixed',
    customSeed: seed,
    gridColumns: map.cols,
    gridRows: map.rows,
  });
  useSandboxStore.setState({ enabled: true, scenario });
  const started = initializeSandbox(scenario);
  expect(started).not.toBeNull();
  useGameLoopStore.getState().startGame(started!.participants);

  for (let turn = 0; turn < maxRounds * scenario.sides.length; turn++) {
    const loop = useGameLoopStore.getState();
    if (loop.phase !== 'inProgress') break;
    const controller = loop.participants.find(
      ({ id }) => id === loop.activePlayer,
    )!.controller;
    // Человек в прогоне без интерфейса пропускает ход, как пассивная сторона.
    if (controller === 'ai') {
      const result = await runAITurn(loop.activePlayer, {
        yieldControl: () => Promise.resolve(),
      });
      expect(result!.commands).toBeLessThanOrEqual(
        AI_CONFIG.maxCommandsPerTurn,
      );
    } else {
      nextTurn(loop.activePlayer);
    }
  }
  return collectReport();
};

describe('sandbox balance', () => {
  it('сценарий по сидам даёт сравнимый итог', async () => {
    const reports: BattleReport[] = [];
    for (const seed of seeds) reports.push(await fight(seed));
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          seeds,
          map,
          maxRounds,
          wins: reports.reduce<Record<string, number>>((wins, report) => {
            const key = report.winner ?? 'none';
            wins[key] = (wins[key] ?? 0) + 1;
            return wins;
          }, {}),
          reports,
        },
        null,
        2,
      ),
    );
    for (const report of reports) {
      for (const side of report.sides) {
        expect(side.stock.gold).toBeGreaterThanOrEqual(0);
        expect(side.stock.wood).toBeGreaterThanOrEqual(0);
      }
    }
  }, 300_000);
});
