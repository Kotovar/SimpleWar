import type { ParticipantId } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';

/**
 * Проверяет, занята ли клетка юнитом или зданием.
 *
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 * @returns `true`, если на клетке есть сущность.
 */
export const isCellOccupied = (x: number, y: number): boolean => {
  const unit = useUnitsStore.getState().getUnitAt(x, y);
  const building = useBuildingsStore.getState().getBuildingAt(x, y);

  return !!unit || !!building;
};

/** Наземный транзит перекрывают здания и чужие юниты; свои пропускают. */
export const blocksGroundTransit = (
  x: number,
  y: number,
  actor: ParticipantId,
) => {
  const unit = useUnitsStore.getState().getUnitAt(x, y);
  return (
    !!useBuildingsStore.getState().getBuildingAt(x, y) ||
    (!!unit && unit.owner !== actor)
  );
};
