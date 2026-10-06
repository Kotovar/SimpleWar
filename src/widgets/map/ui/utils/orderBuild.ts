import { reject } from '@shared/lib';
import { build, giveBuildOrder, type BuildCommand } from '@features/build';
import { advanceOrder } from '@features/pathfinding';

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
