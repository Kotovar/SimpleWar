import { useMovementStore } from './movementStore';

export const useMovementSelectors = () => {
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);

  const calculateActionHighlights = useMovementStore(
    state => state.calculateActionHighlights,
  );
  const resetStore = useMovementStore(state => state.resetStore);

  return {
    reachableCells,
    attackableTargets,
    calculateActionHighlights,
    resetStore,
  };
};
