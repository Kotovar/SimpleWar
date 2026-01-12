import { useUnitsStore } from '@entities/units';

export const useUnitsSelectors = () => {
  const units = useUnitsStore(state => state.units);
  const selectedUnitForSpawn = useUnitsStore(
    state => state.selectedUnitForSpawn,
  );
  const moveUnit = useUnitsStore(state => state.moveUnit);
  const getUnitAt = useUnitsStore(state => state.getUnitAt);
  const changeAttackPoints = useUnitsStore(state => state.changeAttackPoints);
  const changeBuildPoints = useUnitsStore(state => state.changeBuildPoints);
  const spawnUnit = useUnitsStore(state => state.spawnUnit);
  const getUnits = useUnitsStore(state => state.getUnits);
  const selectUnitForSpawn = useUnitsStore(state => state.selectUnitForSpawn);
  const clearSelectedUnitForSpawn = useUnitsStore(
    state => state.clearSelectedUnitForSpawn,
  );
  const resetStore = useUnitsStore(state => state.resetStore);
  const resetUnitsForNewTurn = useUnitsStore(
    state => state.resetUnitsForNewTurn,
  );

  return {
    units,
    selectedUnitForSpawn,
    moveUnit,
    getUnitAt,
    getUnits,
    changeAttackPoints,
    changeBuildPoints,
    spawnUnit,
    resetStore,
    resetUnitsForNewTurn,
    selectUnitForSpawn,
    clearSelectedUnitForSpawn,
  };
};
