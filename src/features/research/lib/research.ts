import {
  RESEARCH_CONFIG,
  type CommandResult,
  type ParticipantId,
  type ResearchType,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { hasResearch, useResearchStore } from '@entities/researches';

/**
 * Есть ли у стороны кузница: без неё исследование не запустить, а начатое
 * стоит на паузе.
 *
 * @param owner - Сторона.
 */
export const hasForge = (owner: ParticipantId) =>
  Object.values(useBuildingsStore.getState().buildings).some(
    building => building.owner === owner && building.type === 'forge',
  );

/** Приказ начать исследование. */
export type StartResearchCommand = {
  actor: ParticipantId;
  research: ResearchType;
};

const validateAndStart = ({
  actor,
  research,
}: StartResearchCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const config = RESEARCH_CONFIG[research];
  if (!config) return reject('target');
  if (!hasForge(actor)) return reject('forge');
  if (hasResearch(actor, research)) return reject('researched');
  if (useResearchStore.getState().current[actor]) return reject('researching');

  const stock = useEconomyStore.getState().resources[actor];
  if (stock.gold < config.cost.gold || stock.wood < config.cost.wood) {
    return reject('resources');
  }

  useEconomyStore.getState().removeResources(actor, config.cost);
  useResearchStore.getState().start(actor, research, config.turns);
  return ok;
};

/**
 * Запускает исследование в кузнице: цена списывается сразу, прогресс идёт
 * в конце своих ходов, включая ход запуска. Одна работа на сторону,
 * повтор изученного запрещён.
 *
 * @param command - Участник и исследование.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const startResearch = (command: StartResearchCommand) =>
  runCommand(
    {
      type: 'startResearch',
      actor: command.actor,
      details: { research: command.research },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndStart(command),
  );

/**
 * Отменяет текущее исследование без возврата цены. Подтверждение
 * спрашивает интерфейс.
 *
 * @param actor - Участник.
 * @returns Успех либо причина отказа.
 */
export const cancelResearch = (actor: ParticipantId) =>
  runCommand(
    { type: 'cancelResearch', actor },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turnRejection = getTurnRejection(actor);
      if (turnRejection) return reject(turnRejection);
      if (!useResearchStore.getState().current[actor]) return reject('target');
      useResearchStore.getState().cancel(actor);
      return ok;
    },
  );
