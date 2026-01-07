import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface GameLoopStoreState {
  currentTurn: number;

  nextTurn: () => void;
}

export const useGameLoopStore = create<GameLoopStoreState>()(
  immer(set => ({
    currentTurn: 0,

    nextTurn: () => {
      set(state => {
        state.currentTurn ??= 0;
        state.currentTurn++;
      });
    },
  })),
);
