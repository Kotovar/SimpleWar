import { useUnitsStore } from '@entities/units';

export const useUnitsSelectors = () => {
  const units = useUnitsStore(state => state.units);
  const moveUnit = useUnitsStore(state => state.moveUnit);
  const getUnitAt = useUnitsStore(state => state.getUnitAt);

  return {
    units,
    moveUnit,
    getUnitAt,
  };
};
