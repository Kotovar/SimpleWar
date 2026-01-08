import { useUnitsStore } from '@entities/units';

export const useUnitsSelectors = () => {
  const units = useUnitsStore(state => state.units);
  const moveUnit = useUnitsStore(state => state.moveUnit);
  const getUnitAt = useUnitsStore(state => state.getUnitAt);
  const changeAttackPoints = useUnitsStore(state => state.changeAttackPoints);
  const spawnUnit = useUnitsStore(state => state.spawnUnit);
  const resetStore = useUnitsStore(state => state.resetStore);
  const resetUnitsForNewTurn = useUnitsStore(
    state => state.resetUnitsForNewTurn,
  );

  return {
    units,
    moveUnit,
    getUnitAt,
    changeAttackPoints,
    spawnUnit,
    resetStore,
    resetUnitsForNewTurn,
  };
};
