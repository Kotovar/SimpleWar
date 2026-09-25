import { gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';

// Подписка общая для партии и не должна добавляться при каждом монтировании Game.
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
