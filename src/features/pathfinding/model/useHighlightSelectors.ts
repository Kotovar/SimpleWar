import { useHighlightStore } from './highlightStore';

export const useHighlightSelectors = () => {
  const spawnableCells = useHighlightStore(state => state.spawnableCells);
  const calculateSpawnableCells = useHighlightStore(
    state => state.calculateSpawnableCells,
  );
  const buildableCells = useHighlightStore(state => state.buildableCells);
  const clearableCells = useHighlightStore(state => state.clearableCells);
  const setClearableCells = useHighlightStore(state => state.setClearableCells);
  const resetStore = useHighlightStore(state => state.resetStore);
  const calculateBuildableCells = useHighlightStore(
    state => state.calculateBuildableCells,
  );

  return {
    spawnableCells,
    buildableCells,
    clearableCells,
    setClearableCells,
    calculateSpawnableCells,
    calculateBuildableCells,
    resetStore,
  };
};
