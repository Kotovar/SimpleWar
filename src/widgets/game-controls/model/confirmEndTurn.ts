import { useJournalStore } from '@entities/journals';
import { usePreferencesStore } from '@entities/settings';

/** Спрашивать ли перед концом хода в текущей партии — вне React. */
export const shouldConfirmEndTurn = () =>
  usePreferencesStore.getState().endTurnQuietGame !==
  useJournalStore.getState().gameId;

/**
 * Вопрос перед концом хода в текущей партии: отключённый действует до
 * конца партии, включить снова можно в «Меню».
 *
 * @returns Спрашивать ли и функция включить или отключить вопрос.
 */
export const useConfirmEndTurn = () => {
  const gameId = useJournalStore(state => state.gameId);
  const quiet = usePreferencesStore(state => state.endTurnQuietGame);
  const setQuiet = usePreferencesStore(state => state.setEndTurnQuietGame);
  return [
    quiet !== gameId,
    (confirm: boolean) => setQuiet(confirm ? null : gameId),
  ] as const;
};
