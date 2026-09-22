import { useSettingsStore } from '@entities/settings';
import { CELL_SIZE } from '@shared/config';

export const useSettingsSelectors = () => {
  const gridColumns = useSettingsStore(state => state.gridColumns);
  const gridRows = useSettingsStore(state => state.gridRows);
  const customSeed = useSettingsStore(state => state.customSeed);
  const mapGenerationMode = useSettingsStore(state => state.mapGenerationMode);
  const setGridSize = useSettingsStore(state => state.setGridSize);
  const setMapGenerationMode = useSettingsStore(
    state => state.setMapGenerationMode,
  );
  const setCustomSeed = useSettingsStore(state => state.setCustomSeed);

  return {
    canvasHeight: gridRows * CELL_SIZE,
    canvasWidth: gridColumns * CELL_SIZE,
    gridColumns,
    gridRows,
    cellSize: CELL_SIZE,
    customSeed,
    mapGenerationMode,

    setGridSize,
    setMapGenerationMode,
    setCustomSeed,
  };
};
