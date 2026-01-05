import { useSelectionStore } from '@features/selection';

export const useSelectionSelectors = () => {
  const selection = useSelectionStore(state => state.selection);

  const selectCell = useSelectionStore(state => state.selectCell);
  const selectUnit = useSelectionStore(state => state.selectUnit);
  const selectBuilding = useSelectionStore(state => state.selectBuilding);

  const getSelectedCell = useSelectionStore(state => state.getSelectedCell);
  const getSelectedUnit = useSelectionStore(state => state.getSelectedUnit);
  const getSelectedBuilding = useSelectionStore(
    state => state.getSelectedBuilding,
  );

  const clearSelection = useSelectionStore(state => state.clearSelection);

  const isClickOnCurrentSelection = useSelectionStore(
    state => state.isClickOnCurrentSelection,
  );

  return {
    unitsSelection: {
      selectUnit,
      getSelectedUnit,
    },
    buildingsSelection: {
      selectBuilding,
      getSelectedBuilding,
    },
    terrainSelection: {
      selectCell,
      getSelectedCell,
    },
    selection,
    clearSelection,
    isClickOnCurrentSelection,
  };
};
