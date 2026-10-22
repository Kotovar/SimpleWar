import type { ParticipantId } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useGameLoopStore } from '@entities/games';
import { isHostile } from '@shared/lib';

/**
 * Проверяет, занята ли клетка юнитом или зданием.
 *
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 * @returns `true`, если на клетке есть сущность.
 */
export const isCellOccupied = (
  x: number,
  y: number,
  ignored?: ReadonlySet<string>,
): boolean => {
  const unit = useUnitsStore.getState().getUnitAt(x, y);
  const building = useBuildingsStore.getState().getBuildingAt(x, y);

  return (!!unit && !ignored?.has(unit.id)) || !!building;
};

/** Наземный транзит перекрывают здания и чужие юниты; свои пропускают. */
export const blocksGroundTransit = (
  x: number,
  y: number,
  actor: ParticipantId,
  ignored?: ReadonlySet<string>,
) => {
  const unit = useUnitsStore.getState().getUnitAt(x, y);
  return (
    !!useBuildingsStore.getState().getBuildingAt(x, y) ||
    (!!unit &&
      !ignored?.has(unit.id) &&
      isHostile(actor, unit.owner, useGameLoopStore.getState().participants))
  );
};
