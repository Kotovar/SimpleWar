import type {
  CivilUnit,
  CommandMeta,
  CommandRejection,
  CommandResult,
  ParticipantId,
} from '@shared/config';
import { getSightSources, isCellVisible, isWorker, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

/**
 * Свой рабочий активного участника или причина отказа.
 *
 * @param actor - Участник, отдающий приказ.
 * @param workerId - ID рабочего.
 */
export const getOwnWorker = (
  actor: ParticipantId,
  workerId: string,
): CivilUnit | CommandRejection => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const unit = useUnitsStore.getState().units[workerId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');
  if (!isWorker(unit)) return reject('actionType');
  return unit;
};

/** Отказ или рабочий: отказ узнаётся по полю `ok`. */
export const isRejection = (
  value: CivilUnit | CommandRejection,
): value is CommandRejection => 'ok' in value;

/**
 * Видна ли клетка участнику по текущему миру.
 *
 * @param actor - Участник.
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 */
export const isVisibleTo = (actor: ParticipantId, x: number, y: number) =>
  isCellVisible(
    getSightSources(
      actor,
      [
        ...Object.values(useUnitsStore.getState().units),
        ...Object.values(useBuildingsStore.getState().buildings),
      ],
      useMapStore.getState().grid,
    ),
    x,
    y,
  );

/**
 * Выполняет команду через общий журнал текущего хода.
 *
 * @param meta - Тип, участник и подробности команды.
 * @param execute - Проверка и исполнение.
 */
export const runWorkerCommand = (
  meta: CommandMeta,
  execute: () => CommandResult,
) => runCommand(meta, useGameLoopStore.getState().currentTurn, execute);
