import { MOVE_COST, type Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';

/**
 * Свободная соседняя клетка, куда рабочий выйдет из здания: сначала по
 * сторонам, затем по диагонали; проходимая местность без юнитов и зданий.
 *
 * @param from - Клетка здания.
 * @returns Клетка выхода или `null`, если выйти некуда.
 */
export const findExit = (from: Position): Position | null => {
  const { getUnitAt } = useUnitsStore.getState();
  const { getBuildingAt } = useBuildingsStore.getState();
  const { getCell } = useMapStore.getState();
  const steps = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  for (const [dx, dy] of steps) {
    const x = from.x + dx;
    const y = from.y + dy;
    const cell = getCell(x, y);
    if (!cell || MOVE_COST[cell.type] === undefined) continue;
    if (getUnitAt(x, y) || getBuildingAt(x, y)) continue;
    return { x, y };
  }
  return null;
};

/**
 * Выводит рабочего из здания на свободную соседнюю клетку без траты очков.
 *
 * @returns Удалось ли выйти.
 */
export const leaveBuilding = (workerId: string) => {
  const worker = useUnitsStore.getState().units[workerId];
  if (!worker) return false;
  const exit = findExit(worker);
  if (!exit) return false;
  useUnitsStore.getState().placeUnit(workerId, exit.x, exit.y);
  return true;
};
