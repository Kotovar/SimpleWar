import { reject } from '@shared/lib';
import { build, giveBuildOrder, type BuildCommand } from '@features/build';
import { advanceOrder } from '@features/pathfinding';
import {
  assignWorker,
  giveWorkOrder,
  type AssignCommand,
} from '@features/workers';

/**
 * Закладывает стройку: приказ «идти и построить» с резервом ресурсов и
 * сразу его исполнение на оставшиеся очки. Рядом с рабочим здание
 * строится сразу, далеко — рабочий идёт и строит по прибытии.
 *
 * @returns Итог постановки приказа; остановка видна в самом приказе.
 */
export const orderBuild = (command: BuildCommand) => {
  const result = giveBuildOrder(command);
  if (result.ok) {
    advanceOrder(command.actor, command.workerId, unit =>
      unit.order.type === 'build'
        ? build({ actor: command.actor, workerId: unit.id, ...unit.order })
        : reject('target'),
    );
  }
  return result;
};

/**
 * Отправляет рабочего в свой пустой рудник или лесопилку: приказ «дойти и
 * работать» и сразу его исполнение. Рядом рабочий входит сразу, далеко —
 * идёт сам и входит по прибытии.
 *
 * @returns Итог постановки приказа.
 */
export const orderWork = (command: AssignCommand) => {
  const result = giveWorkOrder(command);
  if (result.ok) {
    advanceOrder(command.actor, command.workerId, unit =>
      unit.order.type === 'work'
        ? assignWorker({
            actor: command.actor,
            workerId: unit.id,
            buildingId: unit.order.buildingId,
          })
        : reject('target'),
    );
  }
  return result;
};
