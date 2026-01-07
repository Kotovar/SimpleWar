import { useGameLoopStore } from './gameLoopStore';

export const useGameLoopSelectors = () => {
  const currentTurn = useGameLoopStore(state => state.currentTurn);
  const endTurn = useGameLoopStore(state => state.endTurn);
  const activePlayer = useGameLoopStore(state => state.activePlayer);

  return {
    currentTurn,
    endTurn,
    activePlayer,
  };
};
