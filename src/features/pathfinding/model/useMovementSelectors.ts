import { useMovementStore } from './movementStore';

export const useMovementSelectors = () => {
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);
  const buildableCells = useMovementStore(state => state.buildableCells);
  const calculateMovement = useMovementStore(state => state.calculateMovement);
  const resetStore = useMovementStore(state => state.resetStore);
  const calculateBuildableCells = useMovementStore(
    state => state.calculateBuildableCells,
  );

  return {
    reachableCells,
    attackableTargets,
    buildableCells,
    calculateMovement,
    resetStore,
    calculateBuildableCells,
  };
};
