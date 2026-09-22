import { useSettingsStore } from '@entities/settings';

export const useSettingsSelectors = () => {
  const gridColumns = useSettingsStore(state => state.gridColumns);
  const gridRows = useSettingsStore(state => state.gridRows);
  const cellSize = useSettingsStore(state => state.cellSize);
  const customSeed = useSettingsStore(state => state.customSeed);
  const mapGenerationMode = useSettingsStore(state => state.mapGenerationMode);
  const setGridSize = useSettingsStore(state => state.setGridSize);
  const setMapGenerationMode = useSettingsStore(
    state => state.setMapGenerationMode,
  );
  const setCustomSeed = useSettingsStore(state => state.setCustomSeed);
  const zoomBy = useSettingsStore(state => state.zoomBy);
  const resetZoom = useSettingsStore(state => state.resetZoom);

  return {
    canvasHeight: gridRows * cellSize,
    canvasWidth: gridColumns * cellSize,
    gridColumns,
    gridRows,
    cellSize,
    customSeed,
    mapGenerationMode,

    setGridSize,
    setMapGenerationMode,
    setCustomSeed,
    zoomBy,
    resetZoom,
  };
};
