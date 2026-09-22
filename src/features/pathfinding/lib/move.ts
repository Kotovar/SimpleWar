import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { createMovementPFGrid } from './createMovementPFGrid';
import { getPath } from './getPatch';

export const move = (unitId: string, x: number, y: number) => {
  const { phase, activePlayer } = useGameLoopStore.getState();
  const { units, moveUnit } = useUnitsStore.getState();
  const unit = units[unitId];
  const { grid } = useMapStore.getState();
  if (
    phase !== 'inProgress' ||
    !unit ||
    unit.owner !== activePlayer ||
    !grid.length
  )
    return;

  const path = getPath(unit, { x, y }, createMovementPFGrid(grid));
  const cost = path.length - 1;
  if (cost <= 0 || cost > unit.movePoints) return;
  moveUnit(unitId, x, y, cost);
};
