import { getHumanId, useGameLoopStore } from '@entities/games';

export const useGameLoopSelectors = () => {
  const currentTurn = useGameLoopStore(state => state.currentTurn);
  const activePlayer = useGameLoopStore(state => state.activePlayer);
  const participants = useGameLoopStore(state => state.participants);
  const eliminated = useGameLoopStore(state => state.eliminated);
  const phase = useGameLoopStore(state => state.phase);
  const winner = useGameLoopStore(state => state.winner);
  const startError = useGameLoopStore(state => state.startError);
  const startGame = useGameLoopStore(state => state.startGame);
  const endTurn = useGameLoopStore(state => state.endTurn);
  const resetGame = useGameLoopStore(state => state.resetGame);
  const eliminate = useGameLoopStore(state => state.eliminate);

  const humanId = getHumanId(participants);
  const activeController = participants.find(
    ({ id }) => id === activePlayer,
  )?.controller;

  return {
    currentTurn,
    activePlayer,
    activeController,
    participants,
    eliminated,
    humanId,
    phase,
    winner,
    startError,
    startGame,
    endTurn,
    resetGame,
    eliminate,
  };
};
