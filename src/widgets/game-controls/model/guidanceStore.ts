import { create } from 'zustand';
import { isRestoringGame } from '@shared/lib';
import { getHumanId, useGameLoopStore } from '@entities/games';
import { getVisibleRecords, useJournalStore } from '@entities/journals';
import { usePreferencesStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import {
  completedBy,
  hintFor,
  summaryItem,
  type HintId,
  type SummaryItem,
  type TutorialStep,
} from '../lib/guidance';

type GuidanceState = {
  seen: HintId[];
  hints: HintId[];
  tutorialActive: boolean;
  completed: TutorialStep[];
  pending: SummaryItem[];
  summary: SummaryItem[];
  summaryTurn: number;
  dismissHint: () => void;
  dismissSummary: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
};

const initial = () => ({
  seen: [] as HintId[],
  hints: [] as HintId[],
  completed: [] as TutorialStep[],
  tutorialActive: false,
  pending: [] as SummaryItem[],
  summary: [] as SummaryItem[],
  summaryTurn: 0,
});

export const useGuidanceStore = create<GuidanceState>()(set => ({
  ...initial(),
  dismissHint: () => set(state => ({ hints: state.hints.slice(1) })),
  dismissSummary: () => set({ summary: [] }),
  skipTutorial: () => set({ tutorialActive: false }),
  restartTutorial: () => {
    usePreferencesStore.getState().setTutorialEnabled(true);
    usePreferencesStore.getState().markTutorialStarted();
    set({ tutorialActive: true, completed: [] });
  },
}));

/** Синхронные подписки не теряют прогресс при вытеснении старых записей журнала. */
export const initGuidanceSystem = () => {
  let lastId = useJournalStore.getState().nextId - 1;
  const offJournal = useJournalStore.subscribe((journal, previous) => {
    if (isRestoringGame()) {
      lastId = journal.nextId - 1;
      return;
    }
    if (journal.gameId !== previous.gameId) {
      lastId = journal.nextId - 1;
      useGuidanceStore.setState(initial());
      return;
    }
    const loop = useGameLoopStore.getState();
    const player = getHumanId(loop.participants);
    const fresh = journal.entries.filter(entry => entry.id > lastId);
    if (!fresh.length) return;
    lastId = fresh.at(-1)!.id;
    if (!player || loop.phase === 'setup' || useSandboxStore.getState().enabled)
      return;
    const entries = getVisibleRecords(fresh, player);
    const prefs = usePreferencesStore.getState();
    useGuidanceStore.setState(state => {
      const completed = new Set(state.completed);
      const seen = new Set(state.seen);
      const hints = [...state.hints];
      let pending = [...state.pending];
      let summary = state.summary;
      let summaryTurn = state.summaryTurn;
      for (const entry of entries) {
        if (state.tutorialActive && prefs.tutorialEnabled) {
          for (const step of completedBy(entry, player)) completed.add(step);
        }
        const hint = hintFor(entry, player);
        if (hint && !seen.has(hint) && prefs.hintsEnabled) {
          seen.add(hint);
          hints.push(hint);
        }
        const item = summaryItem(entry, player);
        if (item) {
          const index = pending.findIndex(row => row.key === item.key);
          if (index === -1) pending.push(item);
          else
            pending[index] = {
              ...pending[index],
              count: pending[index].count + 1,
            };
        }
        // endTurn записан после очков, осады и пересчёта знаний.
        // Чужая команда невидима игроку, поэтому граница берётся из fresh ниже.
      }
      if (
        fresh.some(entry => entry.type === 'endTurn') &&
        loop.activePlayer === player &&
        loop.phase === 'inProgress'
      ) {
        summary = pending;
        pending = [];
        summaryTurn = loop.currentTurn;
      }
      return {
        completed: [...completed],
        seen: [...seen],
        hints,
        pending,
        summary,
        summaryTurn,
      };
    });
  });
  const offLoop = useGameLoopStore.subscribe((loop, previous) => {
    if (isRestoringGame()) return;
    if (loop.phase !== 'inProgress' || previous.phase !== 'setup') return;
    const player = getHumanId(loop.participants);
    if (!player || useSandboxStore.getState().enabled) return;
    const prefs = usePreferencesStore.getState();
    useGuidanceStore.setState({
      seen: prefs.hintsEnabled ? ['keys'] : [],
      hints: prefs.hintsEnabled ? ['keys'] : [],
      tutorialActive: prefs.tutorialEnabled && !prefs.tutorialStarted,
    });
    prefs.markTutorialStarted();
  });
  return () => {
    offJournal();
    offLoop();
  };
};
