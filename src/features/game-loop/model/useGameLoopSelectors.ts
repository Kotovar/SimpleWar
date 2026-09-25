import { useGameLoopStore } from '@entities/games';

export const useGameLoopSelectors = () => {
  const currentTurn = useGameLoopStore(state => state.currentTurn);
  const activePlayer = useGameLoopStore(state => state.activePlayer);
  const phase = useGameLoopStore(state => state.phase);
  const winner = useGameLoopStore(state => state.winner);
  const startError = useGameLoopStore(state => state.startError);
  const startGame = useGameLoopStore(state => state.startGame);
  const endTurn = useGameLoopStore(state => state.endTurn);
  const resetGame = useGameLoopStore(state => state.resetGame);
  const declareWinner = useGameLoopStore(state => state.declareWinner);

  return {
    currentTurn,
    activePlayer,
    phase,
    winner,
    startError,
    startGame,
    endTurn,
    resetGame,
    declareWinner,
  };
};
