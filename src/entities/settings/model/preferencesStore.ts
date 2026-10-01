import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PreferencesState = {
  /** Спрашивать перед концом хода, если свои юниты ещё не ходили. */
  confirmEndTurn: boolean;
  setConfirmEndTurn: (confirm: boolean) => void;
};

/** Предпочтения игрока в интерфейсе: сохраняются в браузере, не в партии. */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      confirmEndTurn: true,
      setConfirmEndTurn: confirmEndTurn => set({ confirmEndTurn }),
    }),
    { name: 'simplewar:preferences', version: 1 },
  ),
);
