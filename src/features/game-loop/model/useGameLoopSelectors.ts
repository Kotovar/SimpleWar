import { useGameLoopStore } from './gameLoopStore';

export const useGameLoopSelectors = () => {
  const currentTurn = useGameLoopStore(state => state.currentTurn);
  const nextTurn = useGameLoopStore(state => state.nextTurn);

  return {
    currentTurn,
    nextTurn,
  };
};
