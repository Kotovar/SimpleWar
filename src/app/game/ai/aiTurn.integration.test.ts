import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Participant } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { useAiMemoryStore } from '@entities/ai-memories';
import { useBuildingsStore } from '@entities/buildings';
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

describe('runAITurn', () => {
  it('устаревший запуск прекращается, не завершая ход и не сохраняя память', async () => {
    start();
    let cancelledRun = null;
    for (let round = 1; round <= 30 && !cancelledRun; round++) {
      nextTurn('p1');
      const before = useAiMemoryStore.getState().byParticipant.p2;
      const turn = useGameLoopStore.getState().currentTurn;
      let yielded = false;
      const result = await runAITurn('p2', {
        // Первая пауза большого хода: партию перезапустили.
        yieldControl: () => {
          yielded = true;
          useJournalStore.getState().newGame();
          return Promise.resolve();
        },
      });
      if (!yielded) continue;

      cancelledRun = result;
      expect(useGameLoopStore.getState()).toMatchObject({
        activePlayer: 'p2',
        currentTurn: turn,
      });
      expect(useAiMemoryStore.getState().byParticipant.p2).toBe(before);
    }

    expect(cancelledRun).toMatchObject({ cancelled: true });
  });

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
