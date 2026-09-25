import { gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';

// Подписка общая для партии и не должна добавляться при каждом монтировании Game.
let initialized = false;

export const initGameLoopEvents = () => {
  if (initialized) return;
  initialized = true;

  gameEvents.subscribe(event => {
    if (event.type === 'BASE_DESTROYED') {
      // Потеря ратуши выводит участника: его объекты исчезают без событий
      // гибели, добычи и посмертных действий.
      useUnitsStore.getState().removeOwnerUnits(event.owner);
      useBuildingsStore.getState().removeOwnerBuildings(event.owner);

      const before = useGameLoopStore.getState().activePlayer;
      useGameLoopStore.getState().eliminate(event.owner);

      // Выбыл активный: ход перешёл без nextTurn, очки новому активному
      // восстанавливаем здесь же. Доход выбывшему не начисляется.
      const { activePlayer, phase } = useGameLoopStore.getState();
      if (phase === 'inProgress' && activePlayer !== before) {
        useUnitsStore.getState().resetUnitsForNewTurn(activePlayer);
        useBuildingsStore.getState().resetBuildingsForNewTurn(activePlayer);
      }
    }
  });
};
