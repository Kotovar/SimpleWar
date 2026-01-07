import { useUnitsStore } from '@entities/units';
// import { useSelectionStore } from '@features/selection';
// import { useMovementStore } from '@features/pathfinding';
import { useGameLoopStore } from '@features/game-loop';

export const nextTurn = () => {
  useGameLoopStore.getState().nextTurn();
  useUnitsStore.getState().resetUnitsForNewTurn();
  // useSelectionStore.getState().clearSelection();
  // useMovementStore.getState().clearMovement();
};
