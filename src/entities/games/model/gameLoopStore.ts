import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Phase, Player } from '@shared/config';

interface GameLoopStoreState {
  currentTurn: number;
  activePlayer: Player;
  phase: Phase;
  winner: Player | null;
  startError: string | null;

  startGame: () => void;
  endTurn: () => void;
  resetGame: () => void;
  declareWinner: (winner: Player) => void;
}

export const useGameLoopStore = create<GameLoopStoreState>()(
  immer(set => ({
    currentTurn: 0,
    activePlayer: 'player',
    phase: 'setup',
    winner: null,
    startError: null,

    startGame: () =>
      set(state => {
        state.phase = 'inProgress';
        state.startError = null;
        state.currentTurn = 1;
        state.activePlayer = 'player';
      }),

    endTurn: () =>
      set(state => {
        if (state.phase !== 'inProgress') return;

        // TODO: изменить, когда игроков на карте будет больше 2х
        if (state.activePlayer === 'ai') {
          state.currentTurn++;
        }

        state.activePlayer = state.activePlayer === 'player' ? 'ai' : 'player';
      }),

    declareWinner: winner =>
      set(state => {
        state.phase = 'gameOver';
        state.winner = winner;
      }),

    resetGame: () => {
      set(state => {
        state.phase = 'setup';
        state.currentTurn = 0;
        state.activePlayer = 'player';
        state.winner = null;
        state.startError = null;
      });
    },
  })),
);
