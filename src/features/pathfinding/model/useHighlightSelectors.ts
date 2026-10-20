import { useHighlightStore } from './highlightStore';

export const useHighlightSelectors = () => {
  const spawnableCells = useHighlightStore(state => state.spawnableCells);
  const calculateSpawnableCells = useHighlightStore(
    state => state.calculateSpawnableCells,
  );
  const buildableCells = useHighlightStore(state => state.buildableCells);
  const clearableCells = useHighlightStore(state => state.clearableCells);
  const setClearableCells = useHighlightStore(state => state.setClearableCells);
  const roadCells = useHighlightStore(state => state.roadCells);
  const strikeCells = useHighlightStore(state => state.strikeCells);
  const resetStore = useHighlightStore(state => state.resetStore);
  const setBuildableCells = useHighlightStore(state => state.setBuildableCells);

  return {
    spawnableCells,
    buildableCells,
    clearableCells,
    setClearableCells,
    roadCells,
    strikeCells,
    calculateSpawnableCells,
    setBuildableCells,
    resetStore,
  };
};
