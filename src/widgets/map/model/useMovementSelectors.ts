import { useMovementStore } from '@features/pathfinding';

export const useMovementSelectors = () => {
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);
  const calculateMovement = useMovementStore(state => state.calculateMovement);
  const clearMovement = useMovementStore(state => state.clearMovement);

  return {
    reachableCells,
    attackableTargets,
    calculateMovement,
    clearMovement,
  };
};
