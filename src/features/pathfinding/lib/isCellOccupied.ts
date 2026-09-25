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
