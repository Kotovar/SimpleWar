import { useHighlightStore } from './highlightStore';

export const useHighlightSelectors = () => {
  const spawnableCells = useHighlightStore(state => state.spawnableCells);
  const calculateSpawnableCells = useHighlightStore(
    state => state.calculateSpawnableCells,
  );
  const resetStore = useHighlightStore(state => state.resetStore);

  return {
    spawnableCells,
    calculateSpawnableCells,
    resetStore,
  };
};
