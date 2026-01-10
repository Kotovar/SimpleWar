import { useMovementStore } from './movementStore';

export const useMovementSelectors = () => {
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);
  const buildableCells = useMovementStore(state => state.buildableCells);
  const calculateMovement = useMovementStore(state => state.calculateMovement);
  const clearMovement = useMovementStore(state => state.clearMovement);

  return {
    reachableCells,
    attackableTargets,
    buildableCells,
    calculateMovement,
    clearMovement,
  };
};
