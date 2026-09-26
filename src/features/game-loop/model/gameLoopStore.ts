import type { ParticipantId } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { getAliveParticipants, useGameLoopStore } from '@entities/games';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';

/**
 * Выводит участника из партии — единственный путь для потери ратуши и сдачи.
 * Его объекты исчезают без событий гибели, добычи и посмертных действий.
 * Повторный вызов и участник вне партии ничего не меняют.
 *
 * @param owner - Выбывающий участник.
 * @returns `true`, если выбывание применено этим вызовом.
 */
export const eliminateParticipant = (owner: ParticipantId) => {
  const state = useGameLoopStore.getState();
  const isAlive = getAliveParticipants(state).some(({ id }) => id === owner);
  if (state.phase !== 'inProgress' || !isAlive) return false;
  // Ход фиксируем до передачи очереди: сдача активного может завершить круг.
  const turn = state.currentTurn;

  useUnitsStore.getState().removeOwnerUnits(owner);
  useBuildingsStore.getState().removeOwnerBuildings(owner);

  const before = useGameLoopStore.getState().activePlayer;
  useGameLoopStore.getState().eliminate(owner);

  // Выбыл активный: ход перешёл без nextTurn, очки новому активному
  // восстанавливаем здесь же. Доход выбывшему не начисляется.
  const { activePlayer, phase: after } = useGameLoopStore.getState();
  if (after === 'inProgress' && activePlayer !== before) {
    useUnitsStore.getState().resetUnitsForNewTurn(activePlayer);
    useBuildingsStore.getState().resetBuildingsForNewTurn(activePlayer);
  }

  gameEvents.emit({ type: 'PARTICIPANT_ELIMINATED', owner, turn });
  return true;
};

// Подписка общая для партии и не должна добавляться при каждом монтировании Game.
let initialized = false;

export const initGameLoopEvents = () => {
  if (initialized) return;
  initialized = true;

  gameEvents.subscribe(event => {
    if (event.type === 'BASE_DESTROYED') eliminateParticipant(event.owner);
  });
};
