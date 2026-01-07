import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface GameLoopStoreState {
  currentTurn: number;
  activePlayer: 'player' | 'ai';

  endTurn: () => void;
  // startTurn(owner);
  // canEndTurn(owner);
}

export const useGameLoopStore = create<GameLoopStoreState>()(
  immer(set => ({
    currentTurn: 0,
    activePlayer: 'player',

    endTurn: () =>
      set(state => {
        if (state.activePlayer === 'ai') {
          state.currentTurn++;
        }
        state.activePlayer = state.activePlayer === 'player' ? 'ai' : 'player';
      }),
  })),
);
