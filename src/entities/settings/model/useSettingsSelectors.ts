import { useSettingsStore } from '@entities/settings';
import { useMemo } from 'react';

export const useSettingsSelectors = () => {
  const canvasHeight = useSettingsStore(state => state.canvasHeight);
  const canvasWidth = useSettingsStore(state => state.canvasWidth);
  const gridColumns = useSettingsStore(state => state.gridColumns);
  const gridRows = useSettingsStore(state => state.gridRows);
  const customSeed = useSettingsStore(state => state.customSeed);
  const mapGenerationMode = useSettingsStore(state => state.mapGenerationMode);
  const setCanvasSize = useSettingsStore(state => state.setCanvasSize);
  const setGridSize = useSettingsStore(state => state.setGridSize);
  const setMapGenerationMode = useSettingsStore(
    state => state.setMapGenerationMode,
  );
  const setCustomSeed = useSettingsStore(state => state.setCustomSeed);

  const cellSize = useMemo(() => {
    if (gridColumns === 0 || gridRows === 0) return 0;

    return Math.min(canvasWidth / gridColumns, canvasHeight / gridRows);
  }, [canvasWidth, canvasHeight, gridColumns, gridRows]);
  return {
    canvasHeight,
    canvasWidth,
    gridColumns,
    gridRows,
    cellSize,
    customSeed,
    mapGenerationMode,

    setCanvasSize,
    setGridSize,
    setMapGenerationMode,
    setCustomSeed,
  };
};
