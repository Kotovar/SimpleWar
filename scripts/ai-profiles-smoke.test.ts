import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
  AI_PROFILE_TYPES,
  MAP_PRESETS,
  type AiProfile,
  type Participant,
} from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '../src/app/game/ai/aiTurn';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useAiMemoryStore } from '@entities/ai-memories';
import { useResearchStore } from '@entities/researches';
import { useSettingsStore } from '@entities/settings';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';

/**
 * Профили S17 на одном сиде: каждый ИИ развивает экономику и побеждает
 * пассивного игрока; журналы различаются. Исследования проверяются у
 * balanced/economic/defensive: aggressive может выиграть до их начала.
 *
 * Повтор: `pnpm vp test run scripts/ai-profiles-smoke.test.ts`.
 */
const seed = 7;
const map = MAP_PRESETS.medium;
const maxRounds = 150;
const outputPath = '/tmp/simplewar-ai-profiles-smoke.json';

const play = async (profile: AiProfile) => {
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
  const participants: Participant[] = [
    { id: 'p1', controller: 'human' },
    { id: 'p2', controller: 'ai', ai: { profile, difficulty: 'normal' } },
  ];
  expect(initializeGame(participants)).toBe(true);
  useGameLoopStore.getState().startGame(participants);

  let rounds = 0;
  // Стратегия на конце каждого хода и правила всех решений: журнал
  // разработчика ограничен, поэтому собираем по ходу.
  const strategies: Record<string, number> = {};
  const rules: Record<string, number> = {};
  let firstAttack: number | null = null;
  for (let round = 1; round <= maxRounds; round++) {
    if (useGameLoopStore.getState().phase !== 'inProgress') break;
    nextTurn('p1');
    const before = useJournalStore.getState().decisions.at(-1)?.id;
    // react-doctor-disable-next-line async-await-in-loop -- Ходы строго по очереди.
    await runAITurn('p2', { yieldControl: () => Promise.resolve() });
    const decisions = useJournalStore.getState().decisions;
    const from = decisions.findIndex(d => d.id === before) + 1;
    for (const d of decisions.slice(from)) {
      rules[d.ruleId] = (rules[d.ruleId] ?? 0) + 1;
    }
    const strategy = useAiMemoryStore.getState().byParticipant.p2?.strategy;
    if (strategy) strategies[strategy] = (strategies[strategy] ?? 0) + 1;
    if (strategy === 'G08') firstAttack ??= round;
    rounds = round;
  }

  return {
    profile,
    rounds,
    winner: useGameLoopStore.getState().winner,
    researched: useResearchStore.getState().completed.p2 ?? [],
    buildings: Object.values(useBuildingsStore.getState().buildings)
      .filter(({ owner }) => owner === 'p2')
      .map(({ type }) => type)
      .sort(),
    firstAttack,
    strategies,
    rules,
  };
};

describe('AI profiles smoke', () => {
  it('профили побеждают пассивного игрока; неторопливые успевают исследовать', async () => {
    const results = [];
    for (const profile of AI_PROFILE_TYPES) {
      // react-doctor-disable-next-line async-await-in-loop -- Партии идут по очереди на общих хранилищах.
      results.push(await play(profile));
    }
    writeFileSync(outputPath, JSON.stringify({ seed, map, results }, null, 2));

    for (const result of results) {
      expect(result).toMatchObject({ winner: 'p2' });
      if (result.profile !== 'aggressive')
        expect(result.researched.length).toBeGreaterThan(0);
    }
    const journals = results.map(({ strategies }) =>
      JSON.stringify(strategies),
    );
    expect(new Set(journals).size).toBe(results.length);
  }, 300_000);
});
