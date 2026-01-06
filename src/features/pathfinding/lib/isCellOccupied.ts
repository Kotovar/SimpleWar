import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import type { Owner } from '@shared/config';

export const isCellOccupied = (
  x: number,
  y: number,
  target?: Owner,
): boolean => {
  const unit = useUnitsStore.getState().getUnitAt(x, y);
  const building = useBuildingsStore.getState().getBuildingAt(x, y);

  if (target) {
    return unit?.owner === target || building?.owner === target;
  }

  return !!unit || !!building;
};
