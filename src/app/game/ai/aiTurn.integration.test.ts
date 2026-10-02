import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Participant } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { useAiMemoryStore } from '@entities/ai-memories';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';
import { runAITurn } from './aiTurn';

const noWait = () => Promise.resolve();

const THREE: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
];

const start = (participants?: Participant[]) => {
  resetGame();
  useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 3 });
  expect(initializeGame(participants)).toBe(true);
  useGameLoopStore.getState().startGame(participants);
};

/** ID своих юнитов и зданий участника. */
const ownedIds = (owner: string) =>
  new Set(
    [
      ...Object.values(useUnitsStore.getState().units),
      ...Object.values(useBuildingsStore.getState().buildings),
    ]
      .filter(entity => entity.owner === owner)
      .map(({ id }) => id),
  );

beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});

afterEach(() => vi.restoreAllMocks());

describe('runAITurn', () => {
  it('сбой планировщика записывается, а ход всё равно переходит', async () => {
    start();
    nextTurn('p1');
    // Подписчик журнала падает на первом решении: исключение уходит в playTurn.
    let thrown = false;
    const unsubscribe = useJournalStore.subscribe(({ decisions }) => {
      if (thrown || !decisions.length) return;
      thrown = true;
      throw new Error('planner boom');
    });

    const result = await runAITurn('p2', { yieldControl: noWait });
    unsubscribe();

    expect(result).toMatchObject({ stalled: false, cancelled: false });
    expect(useGameLoopStore.getState().activePlayer).toBe('p1');
    expect(useJournalStore.getState().errors).toContainEqual(
      expect.objectContaining({
        actor: 'p2',
        kind: 'failure',
        detail: 'planner boom',
      }),
    );
  });

  it('ход, который не удалось завершить, отмечается как вставший', async () => {
    start();
    nextTurn('p1');
    // Любое списание или доход падает — и команды, и завершение хода.
    const unsubscribe = useEconomyStore.subscribe(() => {
      throw new Error('economy boom');
    });

    const result = await runAITurn('p2', { yieldControl: noWait });
    unsubscribe();

    expect(result).toMatchObject({ stalled: true, cancelled: false });
    expect(useGameLoopStore.getState().activePlayer).toBe('p2');
  });

  it('устаревший запуск прекращается, не завершая ход и не сохраняя память', async () => {
    start();
    nextTurn('p1');
    const before = useAiMemoryStore.getState().byParticipant.p2;
    const turn = useGameLoopStore.getState().currentTurn;
    // После первого решения партию перезапускают: запуск устарел.
    let restarted = false;
    const unsubscribe = useJournalStore.subscribe(({ decisions }) => {
      if (restarted || !decisions.length) return;
      restarted = true;
      useJournalStore.getState().newGame();
    });

    const result = await runAITurn('p2', { yieldControl: noWait });
    unsubscribe();

    expect(result).toMatchObject({ cancelled: true, commands: 1 });
    expect(useGameLoopStore.getState()).toMatchObject({
      activePlayer: 'p2',
      currentTurn: turn,
    });
    expect(useAiMemoryStore.getState().byParticipant.p2).toBe(before);
  });

  it.each([0, 3, 7])(
    'сид %i: 10 ходов без циклов перемещения и исчерпания лимита',
    async seed => {
      let id = 0;
      vi.spyOn(crypto, 'randomUUID').mockImplementation(
        () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
      );
      resetGame();
      useSettingsStore.setState({
        mapGenerationMode: 'fixed',
        customSeed: seed,
      });
      expect(initializeGame()).toBe(true);
      useGameLoopStore.getState().startGame();
      let commands = 0;
      for (let round = 0; round < 10; round++) {
        expect(nextTurn('p1').ok).toBe(true);
        useJournalStore.getState().clearDecisions();
        const paths = new Map(
          Object.values(useUnitsStore.getState().units)
            .filter(u => u.owner === 'p2')
            .map(u => [
              u.id,
              { points: u.movePoints, cells: new Set([`${u.x},${u.y}`]) },
            ]),
        );
        const violations: string[] = [];
        let lastStep = 0;
        const unsubscribe = useJournalStore.subscribe(({ decisions }) => {
          const decision = decisions.at(-1);
          if (!decision || decision.step === lastStep) return;
          lastStep = decision.step;
          if (
            decision.result !== 'ok' ||
            !decision.action.startsWith('движение') ||
            !decision.actorId
          )
            return;
          const unit = useUnitsStore.getState().units[decision.actorId];
          const path = paths.get(decision.actorId);
          if (!unit || !path) return;
          const cell = `${unit.x},${unit.y}`;
          if (path.cells.has(cell) || unit.movePoints >= path.points) {
            violations.push(JSON.stringify(decisions));
          }
          path.cells.add(cell);
          path.points = unit.movePoints;
        });
        try {
          const result = await runAITurn('p2', { yieldControl: noWait });
          expect(result).not.toBeNull();
          if (!result) throw new Error('Ход ИИ не запущен');
          expect(result.cancelled).toBe(false);
          expect(result.reason).not.toBe('предел команд за ход');
          commands += result.commands;
        } finally {
          unsubscribe();
        }
        expect(violations).toEqual([]);
        expect(useGameLoopStore.getState()).toMatchObject({
          activePlayer: 'p1',
          currentTurn: round + 2,
        });
      }
      expect(commands).toBeGreaterThan(0);
    },
  );

  it('два ИИ планируют раздельно: своя память и свои записи решений', async () => {
    start(THREE);
    for (let round = 1; round <= 4; round++) {
      nextTurn('p1');
      await runAITurn('p2', { yieldControl: noWait });
      await runAITurn('p3', { yieldControl: noWait });
    }

    const { byParticipant } = useAiMemoryStore.getState();
    expect(byParticipant.p2?.seed).not.toBe(byParticipant.p3?.seed);
    expect(useGameLoopStore.getState().activePlayer).toBe('p1');

    const decisions = useJournalStore.getState().decisions;
    for (const actor of ['p2', 'p3'] as const) {
      const own = ownedIds(actor);
      const mine = decisions.filter(d => d.actor === actor);
      expect(mine.some(({ result }) => result === 'ok')).toBe(true);
      for (const { actorId } of mine) {
        if (actorId) expect(own.has(actorId)).toBe(true);
      }
    }
    // Обычный журнал участника не получает решений ИИ.
    expect(JSON.stringify(useJournalStore.getState().entries)).not.toContain(
      'strategy',
    );
  });
});
