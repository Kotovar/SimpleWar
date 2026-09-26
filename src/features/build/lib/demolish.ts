import type { CommandResult, ParticipantId } from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

/** Приказ сноса: кто и какое своё здание. */
export type DemolishCommand = { actor: ParticipantId; buildingId: string };

const validateAndDemolish = ({
  actor,
  buildingId,
}: DemolishCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const building = useBuildingsStore.getState().buildings[buildingId];
  if (!building) return reject('notFound');
  if (building.owner !== actor) return reject('owner');
  // Ратушу снести нельзя: это было бы сдачей в обход подтверждения.
  if (building.type === 'base') return reject('target');

  useBuildingsStore.getState().demolishBuilding(buildingId);
  return ok;
};

/**
 * Сносит своё здание, кроме ратуши, без возврата ресурсов: так
 * освобождается проход. Назначения рабочих и население пересчитываются
 * так же, как при разрушении. Подтверждение спрашивает интерфейс.
 *
 * @param command - Участник и здание.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const demolish = (command: DemolishCommand) =>
  runCommand(
    {
      type: 'demolish',
      actor: command.actor,
      details: { buildingId: command.buildingId },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndDemolish(command),
  );
