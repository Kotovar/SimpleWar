import type { ParticipantId, Position, Unit } from '@shared/config';
import { isWorker, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { getOwnWorker, isRejection, runWorkerCommand } from './common';
import { getWorkplaceHolder, type AssignCommand } from './assign';

/** Пустое своё рабочее место для контекстного меню свободного рабочего. */
export const getContextWorkplace = (
  worker: Unit,
  actor: ParticipantId,
  target: Position,
) => {
  if (worker.owner !== actor || !isWorker(worker) || worker.workplaceId)
    return null;
  const building = useBuildingsStore
    .getState()
    .getBuildingAt(target.x, target.y);
  return building?.owner === actor &&
    building.role === 'resource' &&
    !getWorkplaceHolder(building.id)
    ? building
    : null;
};

/** Сохраняет приказ дойти и работать; место повторно проверяется по прибытии. */
export const giveWorkOrder = ({ actor, workerId, buildingId }: AssignCommand) =>
  runWorkerCommand(
    { type: 'order', actor, details: { unitId: workerId, buildingId } },
    () => {
      const worker = getOwnWorker(actor, workerId);
      if (isRejection(worker)) return worker;
      const building = useBuildingsStore.getState().buildings[buildingId];
      if (!building) return reject('notFound');
      if (building.owner !== actor) return reject('owner');
      if (building.role !== 'resource' || worker.workplaceId)
        return reject('target');
      if (getWorkplaceHolder(buildingId)) return reject('workplace');
      useUnitsStore.getState().setOrder(workerId, {
        type: 'work',
        buildingId,
        x: building.x,
        y: building.y,
      });
      return ok;
    },
  );
