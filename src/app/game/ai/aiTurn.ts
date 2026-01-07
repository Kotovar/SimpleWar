import { useGameLoopStore } from '@features/game-loop';

export const runAITurn = async () => {
  useGameLoopStore.getState().endTurn();
};
