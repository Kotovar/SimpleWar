import type { CommandResult, ParticipantId } from '@shared/config';
import { findServingWorker, isAdjacent, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { getOwnWorker, isRejection, runWorkerCommand } from './common';

/** Приказ назначения: кто, какого рабочего и на какое здание. */
export type AssignCommand = {
  actor: ParticipantId;
  workerId: string;
  buildingId: string;
};

/**
 * Занят ли рудник или лесопилка другим рабочим.
 *
 * @param buildingId - Здание.
 * @param exceptWorkerId - Рабочий, который сам на него претендует.
 * @returns ID занявшего рабочего или `null`.
 */
export const getWorkplaceHolder = (
  buildingId: string,
  exceptWorkerId?: string,
) => {
  const units = Object.values(useUnitsStore.getState().units);
  return (
    units.find(
      unit =>
        unit.id !== exceptWorkerId &&
        unit.role === 'civil' &&
        unit.workplaceId === buildingId,
    )?.id ?? null
  );
};

const validateAndAssign = ({
  actor,
  workerId,
  buildingId,
}: AssignCommand): CommandResult => {
  const worker = getOwnWorker(actor, workerId);
  if (isRejection(worker)) return worker;

  const building = useBuildingsStore.getState().buildings[buildingId];
  if (!building) return reject('notFound');
  if (building.owner !== actor) return reject('owner');
  if (building.role !== 'resource') return reject('target');
  if (!isAdjacent(worker, building)) return reject('distance');
  // Одно рабочее место: второй рабочий не встанет на занятое здание.
  if (getWorkplaceHolder(buildingId, workerId)) return reject('workplace');

  useUnitsStore.getState().setWorkplace(workerId, buildingId);
  return ok;
};

/**
 * Назначает своего рабочего на соседний рудник или лесопилку. Прежнее
 * назначение рабочего заменяется. Действие тратится позже — при добыче
 * в конце своего хода.
 *
 * @param command - Участник, рабочий и здание.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const assignWorker = (command: AssignCommand) =>
  runWorkerCommand(
    {
      type: 'assign',
      actor: command.actor,
      details: { workerId: command.workerId, buildingId: command.buildingId },
    },
    () => validateAndAssign(command),
  );

/** Приказ снять рабочего с работы. */
export type UnassignCommand = { actor: ParticipantId; workerId: string };

/**
 * Снимает назначение рабочего; повторное снятие отклоняется.
 *
 * @param command - Участник и рабочий.
 * @returns Успех либо причина отказа.
 */
export const unassignWorker = ({ actor, workerId }: UnassignCommand) =>
  runWorkerCommand({ type: 'unassign', actor, details: { workerId } }, () => {
    const worker = getOwnWorker(actor, workerId);
    if (isRejection(worker)) return worker;
    if (!worker.workplaceId) return reject('target');
    useUnitsStore.getState().setWorkplace(workerId, null);
    return ok;
  });

/**
 * Рабочий, который обслуживает здание прямо сейчас (для интерфейса и ИИ).
 *
 * @param buildingId - Рудник или лесопилка.
 */
export const getServingWorker = (buildingId: string) => {
  const building = useBuildingsStore.getState().buildings[buildingId];
  if (!building) return null;
  return findServingWorker(
    building,
    Object.values(useUnitsStore.getState().units),
  );
};
