import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Phase, Player } from '@shared/config';

interface GameLoopStoreState {
  currentTurn: number;
  activePlayer: Player;
  phase: Phase;

  startGame: () => void;
  setPhase: (phase: Phase) => void;
  endTurn: () => void;
  resetGame: () => void;
}

export const useGameLoopStore = create<GameLoopStoreState>()(
  immer(set => ({
    currentTurn: 0,
    activePlayer: 'player',
    phase: 'setup',

    startGame: () =>
      set(state => {
        state.phase = 'inProgress';
        state.currentTurn = 1;
        state.activePlayer = 'player';
      }),

    setPhase: (phase: Phase) =>
      set(state => {
        state.phase = phase;

        if (phase === 'inProgress') {
          state.currentTurn = 1;
          state.activePlayer = 'player';
        }
      }),

    endTurn: () =>
      set(state => {
        if (state.phase !== 'inProgress') return;

        if (state.activePlayer === 'ai') {
          state.currentTurn++;
        }

        state.activePlayer = state.activePlayer === 'player' ? 'ai' : 'player';
      }),

    resetGame: () => {
      set(state => {
        state.phase = 'setup';
        state.currentTurn = 0;
        state.activePlayer = 'player';
      });
    },
  })),
);
