import { appendFileSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { afterAll, beforeAll, expect, it, vi } from 'vite-plus/test';
import {
  AI_CONFIG,
  AI_PROFILE_TYPES,
  type AiDifficulty,
  type AiProfile,
  type Participant,
  type ParticipantId,
} from '@shared/config';
import { gameEvents } from '@shared/lib';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '@app/game/ai/aiTurn';
import { captureSnapshot } from '@app/saves/snapshot';
import { useAiMemoryStore } from '@entities/ai-memories';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useResearchStore } from '@entities/researches';
import { useDebugStore, useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, resetGame } from '@features/game-loop';
import { useSandboxStore } from '@features/sandbox';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';

/** S21: обычный старт, общие команды и честные наблюдения обоих ИИ. */
const seeds = process.env.ACCEPTANCE_SEEDS
  ? process.env.ACCEPTANCE_SEEDS.split(',').map(Number)
  : Array.from({ length: 20 }, (_, i) => i);
if (seeds.some(seed => !Number.isSafeInteger(seed) || seed < 0))
  throw new Error('ACCEPTANCE_SEEDS: нужны неотрицательные целые сиды');
const rounds = Number(process.env.ACCEPTANCE_ROUNDS ?? 200);
const size = Number(process.env.ACCEPTANCE_SIZE ?? 30);
if (
  !Number.isSafeInteger(rounds) ||
  rounds < 1 ||
  !Number.isSafeInteger(size) ||
  size < 15 ||
  size > 100
)
  throw new Error('Нужны целое число кругов > 0 и размер карты 15–100');
const output = process.env.ACCEPTANCE_OUTPUT ?? '/tmp/simplewar-s21-matches';
const reportPath = `${output}.json`;
const progressPath = `${output}.jsonl`;

type Match = {
  group: 'main' | 'mirror' | 'difficulty' | 'three';
  seed: number;
  profiles: AiProfile[];
  difficulties: AiDifficulty[];
  subject: number;
};
const match = (
  group: Match['group'],
  seed: number,
  profiles: AiProfile[],
  subject = 0,
  difficulty: AiDifficulty = 'normal',
): Match => ({
  group,
  seed,
  profiles,
  subject,
  difficulties: profiles.map((_, i) => (i === subject ? difficulty : 'normal')),
});

// 120 обязательных матчей: три специализированных профиля против
// фиксированного balanced, каждый с двух стартов. 40 balanced/balanced
// дополнительно проверяют симметрию базового ИИ на том же наборе сидов.
const cases = seeds.flatMap(seed =>
  AI_PROFILE_TYPES.flatMap(profile =>
    [0, 1].map(subject =>
      match(
        profile === 'balanced' ? 'mirror' : 'main',
        seed,
        subject === 0 ? [profile, 'balanced'] : ['balanced', profile],
        subject,
      ),
    ),
  ),
);
if (!process.env.ACCEPTANCE_SEEDS) {
  for (const seed of [0, 7, 19]) {
    for (const profile of AI_PROFILE_TYPES) {
      if (profile !== 'balanced')
        cases.push(match('mirror', seed, [profile, profile]));
      for (const difficulty of ['easy', 'hard'] as const)
        cases.push(
          match('difficulty', seed, [profile, 'balanced'], 0, difficulty),
        );
    }
    cases.push(match('three', seed, ['balanced', 'aggressive', 'defensive']));
  }
}
// Независимые процессы могут делить длительный набор, сохраняя все сценарии.
const shardCount = Number(process.env.ACCEPTANCE_SHARDS ?? 1);
const shard = Number(process.env.ACCEPTANCE_SHARD ?? 0);
if (
  !Number.isSafeInteger(shardCount) ||
  shardCount < 1 ||
  !Number.isSafeInteger(shard) ||
  shard < 0 ||
  shard >= shardCount
)
  throw new Error(
    'ACCEPTANCE_SHARD должен быть в диапазоне 0..ACCEPTANCE_SHARDS-1',
  );
const selected = cases.filter((_, i) => i % shardCount === shard);

const results: Array<Record<string, unknown>> = [];
const quantile = (values: number[], fraction: number) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1] ??
  0;

beforeAll(() => {
  writeFileSync(progressPath, '');
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});
afterAll(() => {
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        settings: {
          seeds,
          shard,
          shardCount,
          size,
          maxRounds: rounds,
          reference: 'balanced/normal',
          random:
            'fixed map seed; sequential UUIDs reset for each match; native AI seed',
          debug: false,
          revision:
            process.env.ACCEPTANCE_REVISION ??
            'record separately with git rev-parse HEAD',
        },
        machine: {
          cpu: cpus()[0]?.model,
          os: `${platform()} ${release()}`,
          node: process.version,
        },
        requested: selected.length,
        completed: results.length,
        results,
      },
      null,
      2,
    ),
  );
  vi.restoreAllMocks();
  resetGame();
});

it.each(selected)(
  '$group seed=$seed profiles=$profiles start=$subject levels=$difficulties',
  async spec => {
    resetGame();
    useSandboxStore.setState({ enabled: false, paused: false });
    let serial = 0;
    const ids = vi
      .spyOn(crypto, 'randomUUID')
      .mockImplementation(
        () =>
          `00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, '0')}`,
      );
    useSettingsStore.setState({
      gridColumns: size,
      gridRows: size,
      mapGenerationMode: 'fixed',
      customSeed: spec.seed,
    });
    const participants: Participant[] = spec.profiles.map((profile, i) => ({
      id: `p${i + 1}` as ParticipantId,
      controller: 'ai',
      ai: { profile, difficulty: spec.difficulties[i] },
    }));
    expect(initializeGame(participants)).toBe(true);
    useGameLoopStore.getState().startGame(participants);
    expect(useDebugStore.getState().usedInGame).toBe(false);
    const totals = Object.fromEntries(
      participants.map(({ id }) => [
        id,
        {
          income: { gold: 0, wood: 0 },
          hired: {} as Record<string, number>,
          losses: {} as Record<string, number>,
          rules: {} as Record<string, number>,
          strategyChanges: 0,
        },
      ]),
    );
    const errors: Array<Record<string, unknown>> = [];
    const reasons: Record<string, number> = {};
    const timings: number[] = [];
    const lastStrategy: Partial<Record<ParticipantId, string>> = {};
    const offJournal = useJournalStore.subscribe((next, prev) => {
      const event = next.entries.at(-1);
      if (event && event.id !== prev.entries.at(-1)?.id && event.actor) {
        const side = totals[event.actor];
        if (event.type === 'income') {
          side.income.gold += Number(event.details?.gold ?? 0);
          side.income.wood += Number(event.details?.wood ?? 0);
        }
        if (event.type === 'spawn') {
          const type = String(event.details?.unitType);
          side.hired[type] = (side.hired[type] ?? 0) + 1;
        }
      }
      const decision = next.decisions.at(-1);
      if (decision && decision.id !== prev.decisions.at(-1)?.id) {
        const side = totals[decision.actor];
        side.rules[decision.ruleId] = (side.rules[decision.ruleId] ?? 0) + 1;
        if (
          lastStrategy[decision.actor] &&
          lastStrategy[decision.actor] !== decision.strategy
        )
          side.strategyChanges++;
        lastStrategy[decision.actor] = decision.strategy;
      }
      const error = next.errors.at(-1);
      if (
        error &&
        (error.id !== prev.errors.at(-1)?.id ||
          error.count !== prev.errors.at(-1)?.count)
      )
        errors.push({
          actor: error.actor,
          turn: error.turn,
          command: error.type,
          code: error.code,
          details: error.details,
          detail: error.detail,
        });
    });
    const offEvents = gameEvents.subscribe(event => {
      if (
        event.type === 'UNIT_DESTROYED' ||
        (event.type === 'BUILDING_DESTROYED' && !event.demolished)
      ) {
        const type =
          event.type === 'UNIT_DESTROYED'
            ? event.unit.type
            : event.building.type;
        const side = totals[event.owner];
        side.losses[type] = (side.losses[type] ?? 0) + 1;
      }
    });
    let failure: unknown;
    let turns = 0;
    const started = performance.now();
    try {
      while (
        useGameLoopStore.getState().phase === 'inProgress' &&
        useGameLoopStore.getState().currentTurn <= rounds
      ) {
        const before = useGameLoopStore.getState();
        const start = performance.now();
        // Общие хранилища и строгая очередь: одновременные ходы запрещены.
        const result = await runAITurn(before.activePlayer, {
          yieldControl: () => Promise.resolve(),
        });
        timings.push(performance.now() - start);
        turns++;
        expect(result).not.toBeNull();
        expect(result!.stalled).toBe(false);
        expect(result!.commands).toBeLessThanOrEqual(
          AI_CONFIG.maxCommandsPerTurn,
        );
        expect([
          'сбой планировщика',
          'предел команд за ход',
          'повторные отказы команд',
        ]).not.toContain(result!.reason);
        reasons[result!.reason] = (reasons[result!.reason] ?? 0) + 1;
        for (const participant of participants) {
          const stock = useEconomyStore.getState().resources[participant.id];
          expect(stock.gold).toBeGreaterThanOrEqual(0);
          expect(stock.wood).toBeGreaterThanOrEqual(0);
        }
        if (useGameLoopStore.getState().phase === 'inProgress') {
          expect(result!.cancelled).toBe(false);
          expect(useGameLoopStore.getState().activePlayer).not.toBe(
            before.activePlayer,
          );
        }
        if (turns % (participants.length * 25) === 0) captureSnapshot();
      }
      captureSnapshot();
      expect(errors.filter(error => error.code === 'failure')).toEqual([]);
      expect(
        errors.filter(error => error.code === 'terrain'),
        'ИИ не должен повторять стройку на известной неподходящей местности',
      ).toEqual([]);
      expect(
        useGameLoopStore.getState().phase,
        '200 ходов — диагностический тайм-аут, не ничья',
      ).toBe('gameOver');
    } catch (error) {
      failure = error;
      try {
        writeFileSync(
          `${output}-failure-${spec.group}-${spec.seed}-${spec.profiles.join('-')}-${spec.subject}-${spec.difficulties.join('-')}.json`,
          JSON.stringify(captureSnapshot()),
        );
      } catch {
        // Сбой валидации самого снимка отражён в error; данные мира не теряем.
        writeFileSync(
          `${output}-invalid-${spec.group}-${spec.seed}-${spec.profiles.join('-')}-${spec.subject}-${spec.difficulties.join('-')}.json`,
          JSON.stringify({
            loop: useGameLoopStore.getState(),
            units: useUnitsStore.getState().units,
            buildings: useBuildingsStore.getState().buildings,
            economy: useEconomyStore.getState(),
            memory: useAiMemoryStore.getState().byParticipant,
          }),
        );
      }
    } finally {
      offJournal();
      offEvents();
      ids.mockRestore();
    }
    const result = {
      ...spec,
      status: failure ? 'failed' : 'passed',
      error:
        failure instanceof Error
          ? failure.message
          : failure
            ? JSON.stringify(failure)
            : null,
      winner: useGameLoopStore.getState().winner,
      rounds: useGameLoopStore.getState().currentTurn,
      turns,
      durationMs: performance.now() - started,
      turnP95Ms: quantile(timings, 0.95),
      turnMaxMs: Math.max(...timings),
      usedFallback: useMapStore.getState().usedFallback,
      reasons,
      errors,
      totals,
      sides: participants.map(({ id }) => ({
        id,
        stock: useEconomyStore.getState().resources[id],
        researched: useResearchStore.getState().completed[id] ?? [],
        explored: [
          ...(useKnowledgeStore.getState().byParticipant[id]?.visible ?? []),
        ].filter(value => value > 0).length,
        tasks: useAiMemoryStore.getState().byParticipant[id]?.tasks ?? [],
        overdueTasks: (
          useAiMemoryStore.getState().byParticipant[id]?.tasks ?? []
        ).filter(
          task => task.reviewTurn < useGameLoopStore.getState().currentTurn,
        ).length,
        units: Object.values(useUnitsStore.getState().units)
          .filter(u => u.owner === id)
          .map(u => u.type),
        buildings: Object.values(useBuildingsStore.getState().buildings)
          .filter(b => b.owner === id)
          .map(b => b.type),
      })),
    };
    results.push(result);
    appendFileSync(progressPath, JSON.stringify(result) + '\n');
    console.log(
      `${results.length}/${selected.length}: ${result.status} ${spec.seed} ${spec.profiles.join('/')} ${result.rounds} ходов, winner=${result.winner}`,
    );
    if (failure) throw failure;
  },
  300_000,
);
