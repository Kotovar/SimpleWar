import type { ParticipantId, Position, Unit } from '@shared/config';
import { canHouseWorker, isWorker, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { getOwnWorker, isRejection, runWorkerCommand } from './common';
import { getWorkplaceHolder, type AssignCommand } from './assign';

/**
 * Своё место для рабочего под курсором: пустой рудник, лесопилка или
 * ратуша-укрытие. С `taken` — и занятая ратуша: приказ на неё получит
 * отказ `workplace`, и игрок увидит, что место занято.
 */
export const getContextWorkplace = (
  worker: Unit,
  actor: ParticipantId,
  target: Position,
  taken = false,
) => {
  if (worker.owner !== actor || !isWorker(worker) || worker.workplaceId)
    return null;
  const building = useBuildingsStore
    .getState()
    .getBuildingAt(target.x, target.y);
  return building?.owner === actor &&
    canHouseWorker(building) &&
    (!getWorkplaceHolder(building.id) || (taken && building.type === 'base'))
    ? building
    : null;
};

/**
 * Сохраняет приказ дойти и войти в рудник, лесопилку или ратушу-укрытие;
 * место повторно проверяется по прибытии.
 */
export const giveWorkOrder = ({ actor, workerId, buildingId }: AssignCommand) =>
  runWorkerCommand(
    { type: 'order', actor, details: { unitId: workerId, buildingId } },
    () => {
      const worker = getOwnWorker(actor, workerId);
      if (isRejection(worker)) return worker;
      const building = useBuildingsStore.getState().buildings[buildingId];
      if (!building) return reject('notFound');
      if (building.owner !== actor) return reject('owner');
      if (!canHouseWorker(building) || worker.workplaceId)
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
