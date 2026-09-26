import { REPAIR, type CommandResult, type ParticipantId } from '@shared/config';
import { isAdjacent, ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { getOwnWorker, isRejection, runWorkerCommand } from './common';

/** Приказ ремонта: кто, каким рабочим и какое своё здание. */
export type RepairCommand = {
  actor: ParticipantId;
  workerId: string;
  buildingId: string;
};

/**
 * Сколько HP восстановит один ремонт: не больше недостающего.
 *
 * @param hp - Текущее HP здания.
 * @param maxHp - Максимальное HP.
 */
export const getRepairAmount = (hp: number, maxHp: number) =>
  Math.max(0, Math.min(REPAIR.hp, maxHp - hp));

const validateAndRepair = ({
  actor,
  workerId,
  buildingId,
}: RepairCommand): CommandResult => {
  const worker = getOwnWorker(actor, workerId);
  if (isRejection(worker)) return worker;

  // Уничтоженное здание не восстанавливается: его уже нет.
  const building = useBuildingsStore.getState().buildings[buildingId];
  if (!building) return reject('notFound');
  if (building.owner !== actor) return reject('owner');
  if (!isAdjacent(worker, building)) return reject('distance');
  const amount = getRepairAmount(building.hp, building.maxHp);
  if (amount === 0) return reject('target');
  if (worker.buildPoints <= 0) return reject('points');

  const { resources, removeResources } = useEconomyStore.getState();
  const { gold, wood } = resources[actor];
  if (gold < REPAIR.cost.gold || wood < REPAIR.cost.wood) {
    return reject('resources');
  }

  useBuildingsStore.getState().repairBuilding(buildingId, amount);
  removeResources(actor, REPAIR.cost);
  // Ремонт — рабочее действие: движение заканчивается, добычи в этот ход нет.
  useUnitsStore.getState().changeBuildPoints(workerId);
  return ok;
};

/**
 * Чинит своё соседнее здание: +HP по конфигурации, не выше максимума,
 * списывает цену и рабочее действие.
 *
 * @param command - Участник, рабочий и здание.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const repair = (command: RepairCommand) =>
  runWorkerCommand(
    {
      type: 'repair',
      actor: command.actor,
      details: { workerId: command.workerId, buildingId: command.buildingId },
    },
    () => validateAndRepair(command),
  );
