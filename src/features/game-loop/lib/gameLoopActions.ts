import type { CommandResult, ParticipantId } from '@shared/config';
import { calculateTurnIncome, gameEvents, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useDebugStore, useSettingsStore } from '@entities/settings';
import { useEconomyStore } from '@entities/economies';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { eliminateParticipant } from '../model/gameLoopStore';

const validateAndEndTurn = (actor: ParticipantId): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  // Добыча в конце своего хода: рабочий тратит на неё рабочее действие.
  const units = useUnitsStore.getState();
  const { income, miners } = calculateTurnIncome(
    useBuildingsStore.getState().getEconomicBuildings(actor),
    Object.values(units.units).filter(({ owner }) => owner === actor),
  );
  for (const id of miners) units.changeBuildPoints(id);
  useEconomyStore.getState().addResources(actor, income);

  useGameLoopStore.getState().endTurn();

  const next = useGameLoopStore.getState().activePlayer;
  useUnitsStore.getState().resetUnitsForNewTurn(next);
  useBuildingsStore.getState().resetBuildingsForNewTurn(next);
  return ok;
};

/**
 * Завершает ход участника: начисляет ему доход, передаёт ход следующему
 * и восстанавливает очки только новому активному участнику.
 *
 * @param actor - Участник, который завершает свой ход.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const nextTurn = (actor: ParticipantId) =>
  runCommand(
    { type: 'endTurn', actor },
    useGameLoopStore.getState().currentTurn,
    () => validateAndEndTurn(actor),
  );

const validateAndSurrender = (actor: ParticipantId): CommandResult => {
  if (useGameLoopStore.getState().phase !== 'inProgress') {
    return reject('phase');
  }
  // Сдаться можно и в чужой ход, но только за себя и один раз.
  if (!eliminateParticipant(actor)) return reject('notFound');
  return ok;
};

/**
 * Сдача: участник выбывает так же, как при потере ратуши.
 *
 * @param actor - Сдающийся участник; сдаться за другого нельзя.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const surrender = (actor: ParticipantId) =>
  runCommand(
    { type: 'surrender', actor },
    useGameLoopStore.getState().currentTurn,
    () => validateAndSurrender(actor),
  );

/** Сбрасывает фазу, объекты, карту, настройки, отладку, экономику и журнал. */
export const resetGame = () => {
  useGameLoopStore.getState().resetGame();
  useBuildingsStore.getState().resetStore();
  useUnitsStore.getState().resetStore();
  useMapStore.getState().resetStore();
  useSettingsStore.getState().resetStore();
  useDebugStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
  useJournalStore.getState().newGame();
  gameEvents.emit({ type: 'GAME_RESET' });
};
