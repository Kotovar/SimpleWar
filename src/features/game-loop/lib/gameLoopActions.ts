import type { CommandResult, ParticipantId } from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useEconomyStore } from '@entities/economies';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { calculateIncome } from './calculateIncome';

const validateAndEndTurn = (actor: ParticipantId): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const income = calculateIncome(
    useBuildingsStore.getState().getEconomicBuildings(actor),
  );
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

/** Сбрасывает фазу, объекты, карту, настройки, экономику и журнал партии. */
export const resetGame = () => {
  useGameLoopStore.getState().resetGame();
  useBuildingsStore.getState().resetStore();
  useUnitsStore.getState().resetStore();
  useMapStore.getState().resetStore();
  useSettingsStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
  useJournalStore.getState().newGame();
};
