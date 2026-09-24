import { gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';

let initialized = false;

export const initGameLoopEvents = () => {
  if (initialized) return;
  initialized = true;

  gameEvents.subscribe(event => {
    if (event.type === 'BASE_DESTROYED') {
      const winner = event.owner === 'player' ? 'ai' : 'player';
      useGameLoopStore.getState().declareWinner(winner);
    }
  });
};
