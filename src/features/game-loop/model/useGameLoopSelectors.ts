import { useGameLoopStore } from './gameLoopStore';

export const useGameLoopSelectors = () => {
  const currentTurn = useGameLoopStore(state => state.currentTurn);
  const activePlayer = useGameLoopStore(state => state.activePlayer);
  const phase = useGameLoopStore(state => state.phase);
  const startGame = useGameLoopStore(state => state.startGame);
  const setPhase = useGameLoopStore(state => state.setPhase);
  const endTurn = useGameLoopStore(state => state.endTurn);
  const resetGame = useGameLoopStore(state => state.resetGame);

  return {
    currentTurn,
    activePlayer,
    phase,
    startGame,
    setPhase,
    endTurn,
    resetGame,
  };
};
