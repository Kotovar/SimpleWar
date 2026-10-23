import { appendFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it, vi } from 'vite-plus/test';
import {
  AI_CONFIG,
  type Participant,
  type ParticipantId,
  type TeamId,
} from '@shared/config';
import { gameEvents, isHostile } from '@shared/lib';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '@app/game/ai/aiTurn';
import { captureSnapshot } from '@app/saves/snapshot';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useKnowledgeStore } from '@entities/perceptions';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { useSandboxStore } from '@features/sandbox';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';
import { trackSites } from './siteMetrics';

/** P02: полные партии команд от обычного старта, ИИ balanced/normal. */
const seeds = (process.env.TEAM_SEEDS ?? '0,1,2,3,4').split(',').map(Number);
const size = Number(process.env.TEAM_SIZE ?? 36);
const withSites = process.env.ACCEPTANCE_SITES === '1';
const rounds = Number(process.env.TEAM_ROUNDS ?? 300);
const output = process.env.TEAM_OUTPUT ?? '/tmp/simplewar-team-matches';

/** Команды по местам p1..pN; `human` — p1 только завершает ход. */
const LAYOUTS: Record<string, { teams: TeamId[]; human?: boolean }> = {
  '2v1': { teams: [1, 1, 2] },
  '2v2': { teams: [1, 1, 2, 2] },
  '2v2-alt': { teams: [1, 2, 1, 2] },
  mixed: { teams: [1, 1, 2, 3] },
  'human+ai-v2': { teams: [1, 1, 2, 2], human: true },
};
const cases = Object.keys(LAYOUTS).flatMap(layout =>
  seeds.map(seed => ({ layout, seed })),
);
const results: object[] = [];

beforeAll(() => {
  writeFileSync(`${output}.jsonl`, '');
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});
afterAll(() => {
  writeFileSync(`${output}.json`, JSON.stringify(results, null, 2));
  vi.restoreAllMocks();
  resetGame();
});

it.each(cases)(
  '$layout seed=$seed',
  async ({ layout, seed }) => {
    const { teams, human } = LAYOUTS[layout];
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
      customSeed: seed,
    });
    const participants: Participant[] = teams.map((team, i) =>
      human && i === 0
        ? { id: 'p1', controller: 'human', team }
        : {
            id: `p${i + 1}` as ParticipantId,
            controller: 'ai',
            ai: { profile: 'balanced', difficulty: 'normal' },
            team,
          },
    );
    expect(initializeGame(participants, { withSites })).toBe(true);
    useGameLoopStore.getState().startGame(participants);
    const sites = trackSites();

    const allied = (a: ParticipantId, b: ParticipantId) =>
      a !== b && !isHostile(a, b, participants);
    const violations: string[] = [];
    const friendlyStrikeHits: object[] = [];
    const heals = { own: 0, allied: 0 };
    let strike: { owner: ParticipantId; x: number; y: number } | null = null;
    const eliminatedAt: Record<string, number> = {};
    const off = gameEvents.subscribe(event => {
      const turn = useGameLoopStore.getState().currentTurn;
      const active = useGameLoopStore.getState().activePlayer;
      if (event.type === 'SIEGE_STRIKE_EXECUTED') strike = event;
      if (event.type === 'ATTACK_LANDED') {
        const { owner, x, y } = event.target;
        const byStrike = strike && strike.x === x && strike.y === y;
        if (byStrike && allied(strike!.owner, owner))
          friendlyStrikeHits.push({ turn, by: strike!.owner, owner, x, y });
        if (!byStrike && !isHostile(active, owner, participants))
          violations.push(`t${turn}: ${active} атаковал ${owner} (${x},${y})`);
      }
      if (event.type === 'COMMAND_SUCCEEDED' && event.command.type === 'heal') {
        const target = useUnitsStore.getState().units[
          String(event.command.details?.targetId)
        ];
        if (target && target.owner !== active) heals.allied++;
        else heals.own++;
      }
      if (event.type === 'PARTICIPANT_ELIMINATED')
        eliminatedAt[event.owner] = event.turn;
    });

    let failure: unknown;
    let turns = 0;
    const started = performance.now();
    try {
      while (
        useGameLoopStore.getState().phase === 'inProgress' &&
        useGameLoopStore.getState().currentTurn <= rounds
      ) {
        const actor = useGameLoopStore.getState().activePlayer;
        const before = structuredClone(useEconomyStore.getState().resources);
        if (human && actor === 'p1') {
          expect(nextTurn('p1').ok).toBe(true);
        } else {
          const result = await runAITurn(actor, {
            yieldControl: () => Promise.resolve(),
          });
          turns++;
          expect(result?.stalled).toBe(false);
          expect(result!.commands).toBeLessThanOrEqual(
            AI_CONFIG.maxCommandsPerTurn,
          );
        }
        // Экономика личная: чужой ход не меняет запасы союзника.
        for (const { id } of participants)
          if (id !== actor)
            expect(useEconomyStore.getState().resources[id], id).toEqual(
              before[id],
            );
        // Память о контактах — только враги, союзники в неё не попадают.
        for (const { id } of participants)
          for (const contact of Object.values(
            useKnowledgeStore.getState().byParticipant[id]?.contacts ?? {},
          ))
            expect(isHostile(id, contact.owner, participants)).toBe(true);
        // Выбывший не ходит.
        const { activePlayer, eliminated, phase } = useGameLoopStore.getState();
        if (phase === 'inProgress')
          expect(eliminated).not.toContain(activePlayer);
      }
      captureSnapshot();
      expect(violations).toEqual([]);
      expect(
        useJournalStore.getState().errors.filter(e => e.code === 'failure'),
      ).toEqual([]);
      const { phase, winner, eliminated } = useGameLoopStore.getState();
      if (phase === 'gameOver' && winner) {
        const winners = participants.filter(
          p => !isHostile(winner, p.id, participants),
        );
        // Ни один враг победителя не остался в игре.
        expect(
          participants.filter(
            p =>
              isHostile(winner, p.id, participants) &&
              !eliminated.includes(p.id),
          ),
        ).toEqual([]);
        expect(winners.some(p => !eliminated.includes(p.id))).toBe(true);
      }
    } catch (error) {
      failure = error;
    } finally {
      sites.off();
      off();
      ids.mockRestore();
    }
    const state = useGameLoopStore.getState();
    const result = {
      layout,
      seed,
      teams,
      withSites,
      sites: sites.data,
      status: failure
        ? 'failed'
        : state.phase === 'gameOver'
          ? 'passed'
          : 'timeout',
      error: failure instanceof Error ? failure.message : null,
      rounds: state.currentTurn,
      winner: state.winner,
      winnerTeam: participants.find(p => p.id === state.winner)?.team ?? null,
      eliminatedAt,
      heals,
      friendlyStrikeHits,
      aiTurns: turns,
      durationMs: Math.round(performance.now() - started),
      errors: useJournalStore.getState().errors,
      commandErrors: useJournalStore
        .getState()
        .errors.reduce<Record<string, number>>((acc, e) => {
          acc[e.code] = (acc[e.code] ?? 0) + e.count;
          return acc;
        }, {}),
    };
    results.push(result);
    appendFileSync(`${output}.jsonl`, JSON.stringify(result) + '\n');
    console.log(
      `${layout} seed=${seed}: ${result.status} ${result.rounds} кругов, команда ${result.winnerTeam}`,
    );
    if (failure) throw failure;
  },
  600_000,
);
