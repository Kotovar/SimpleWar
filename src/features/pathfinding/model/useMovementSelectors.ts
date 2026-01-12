import { useMovementStore } from './movementStore';

export const useMovementSelectors = () => {
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);

  const calculateMovement = useMovementStore(state => state.calculateMovement);
  const resetStore = useMovementStore(state => state.resetStore);

  return {
    reachableCells,
    attackableTargets,
    calculateMovement,
    resetStore,
  };
};
