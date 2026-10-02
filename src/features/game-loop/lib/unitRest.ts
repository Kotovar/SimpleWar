import type { ParticipantId, Unit } from '@shared/config';
import { ok, reject } from '@shared/lib';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { useUnitsStore } from '@entities/units';

/** Пропуск сжигает все очки; сон и пробуждение их не меняют. */
export const setUnitRest = ({
  actor,
  unitId,
  mode,
}: {
  actor: ParticipantId;
  unitId: string;
  mode: NonNullable<Unit['restMode']> | null;
}) =>
  runCommand(
    { type: 'rest', actor, details: { unitId, mode: mode ?? 'awake' } },
    useGameLoopStore.getState().currentTurn,
    () => {
      const rejection = getTurnRejection(actor);
      if (rejection) return reject(rejection);
      const { units, setRestMode } = useUnitsStore.getState();
      const unit = units[unitId];
      if (!unit) return reject('notFound');
      if (unit.owner !== actor) return reject('owner');
      setRestMode(unitId, mode);
      return ok;
    },
  );
