import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useJournalStore } from '@entities/journals';
import { usePreferencesStore } from '@entities/settings';
import { shouldConfirmEndTurn } from './confirmEndTurn';

beforeEach(() => usePreferencesStore.getState().setEndTurnQuietGame(null));

describe('вопрос перед концом хода', () => {
  it('«больше не спрашивать» действует только до новой партии', () => {
    expect(shouldConfirmEndTurn()).toBe(true);
    usePreferencesStore
      .getState()
      .setEndTurnQuietGame(useJournalStore.getState().gameId);
    expect(shouldConfirmEndTurn()).toBe(false);

    useJournalStore.getState().newGame();
    expect(shouldConfirmEndTurn()).toBe(true);
  });
});
