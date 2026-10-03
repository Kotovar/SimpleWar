import type { CommandResult, ParticipantId } from '@shared/config';
import { calculateTurnIncome, gameEvents, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useDebugStore, useSettingsStore } from '@entities/settings';
import { useEconomyStore } from '@entities/economies';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { hasResearch, useResearchStore } from '@entities/researches';
import { eliminateParticipant } from '../model/gameLoopStore';
import { executePreparedStrikes } from './strikes';

/**
 * Прогресс исследования в конце своего хода. Без кузницы работа стоит на
 * паузе: новая кузница продолжает её с того же места.
 */
const advanceResearch = (actor: ParticipantId) => {
  const hasForge = Object.values(useBuildingsStore.getState().buildings).some(
    ({ owner, type }) => owner === actor && type === 'forge',
  );
  if (!hasForge) return;
  const done = useResearchStore.getState().advance(actor);
  if (!done) return;
  useJournalStore.getState().record({
    type: 'researchDone',
    actor,
    turn: useGameLoopStore.getState().currentTurn,
    visibleTo: [actor],
    details: { research: done },
  });
};

const validateAndEndTurn = (actor: ParticipantId): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  // Добыча в конце своего хода: рабочий тратит на неё рабочее действие.
  const units = useUnitsStore.getState();
  const { income, miners } = calculateTurnIncome(
    useBuildingsStore.getState().getEconomicBuildings(actor),
    Object.values(units.units).filter(({ owner }) => owner === actor),
    hasResearch(actor, 'artel'),
  );
  for (const id of miners) units.changeBuildPoints(id);
  useEconomyStore.getState().addResources(actor, income);
  const mined = miners.map(id => {
    const worker = units.units[id];
    return worker?.role === 'civil' && worker.workplaceId
      ? useBuildingsStore.getState().buildings[worker.workplaceId]?.type
      : null;
  });
  useJournalStore.getState().record({
    type: 'income',
    actor,
    turn: useGameLoopStore.getState().currentTurn,
    visibleTo: [actor],
    details: {
      ...income,
      minedGold: mined.includes('mine') ? 1 : 0,
      minedWood: mined.includes('sawmill') ? 1 : 0,
    },
  });
  advanceResearch(actor);

  useGameLoopStore.getState().endTurn();

  const next = useGameLoopStore.getState().activePlayer;
  useUnitsStore.getState().resetUnitsForNewTurn(next);
  useBuildingsStore.getState().resetBuildingsForNewTurn(next);
  // Шаг 8: подготовленные удары нового активного участника.
  executePreparedStrikes(next);
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

/** Сбрасывает фазу, объекты, карту, настройки, отладку, экономику, исследования и журнал. */
export const resetGame = () => {
  useGameLoopStore.getState().resetGame();
  useBuildingsStore.getState().resetStore();
  useUnitsStore.getState().resetStore();
  useMapStore.getState().resetStore();
  useSettingsStore.getState().resetStore();
  useDebugStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
  useResearchStore.getState().resetStore();
  useJournalStore.getState().newGame();
  gameEvents.emit({ type: 'GAME_RESET' });
};
