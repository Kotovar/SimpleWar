import { useHighlightStore } from './highlightStore';

export const useHighlightSelectors = () => {
  const spawnableCells = useHighlightStore(state => state.spawnableCells);
  const calculateSpawnableCells = useHighlightStore(
    state => state.calculateSpawnableCells,
  );
  const buildableCells = useHighlightStore(state => state.buildableCells);
  const resetStore = useHighlightStore(state => state.resetStore);
  const calculateBuildableCells = useHighlightStore(
    state => state.calculateBuildableCells,
  );

  return {
    spawnableCells,
    buildableCells,
    calculateSpawnableCells,
    calculateBuildableCells,
    resetStore,
  };
};
