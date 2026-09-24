import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  CELL_SIZE,
  CELL_SIZE_LIMITS,
  MAP_PRESETS,
  TEMP_START_SEED,
} from '@shared/config';
import { useSettingsStore } from './settingsStore';

const zoomTo = (edge: 'min' | 'max') => {
  const direction = edge === 'max' ? 1 : -1;
  // Шагов заведомо больше, чем нужно для любой границы.
  for (let step = 0; step < 50; step++) {
    useSettingsStore.getState().zoomBy(direction);
  }

  return useSettingsStore.getState().cellSize;
};

describe('масштаб карты', () => {
  beforeEach(() => {
    useSettingsStore.setState({ cellSize: CELL_SIZE });
  });

  it('увеличивает и уменьшает клетку с заданным шагом', () => {
    useSettingsStore.getState().zoomBy(1);
    expect(useSettingsStore.getState().cellSize).toBe(
      Math.round(CELL_SIZE * CELL_SIZE_LIMITS.step),
    );

    useSettingsStore.setState({ cellSize: CELL_SIZE });
    useSettingsStore.getState().zoomBy(-1);
    expect(useSettingsStore.getState().cellSize).toBe(
      Math.round(CELL_SIZE / CELL_SIZE_LIMITS.step),
    );
  });

  it('не выходит за границы масштаба', () => {
    expect(zoomTo('max')).toBe(CELL_SIZE_LIMITS.max);
    expect(zoomTo('min')).toBe(CELL_SIZE_LIMITS.min);
  });

  it('держит размер клетки целым: дробный даёт швы между клетками', () => {
    for (let step = 0; step < 6; step++) {
      useSettingsStore.getState().zoomBy(1);
      expect(Number.isInteger(useSettingsStore.getState().cellSize)).toBe(true);
    }
  });

  it('возвращает исходный масштаб по сбросу', () => {
    useSettingsStore.getState().zoomBy(3);
    expect(useSettingsStore.getState().cellSize).not.toBe(CELL_SIZE);

    useSettingsStore.getState().resetZoom();
    expect(useSettingsStore.getState().cellSize).toBe(CELL_SIZE);
  });

  it('сбрасывает масштаб вместе со всем хранилищем', () => {
    useSettingsStore.getState().zoomBy(2);
    useSettingsStore.getState().resetStore();

    expect(useSettingsStore.getState().cellSize).toBe(CELL_SIZE);
  });

  it('обновляет режим генерации, сид и размер карты', () => {
    const store = useSettingsStore.getState();
    store.setMapGenerationMode('fixed');
    store.setCustomSeed(73);
    store.setGridSize(18, 12);

    expect(useSettingsStore.getState()).toMatchObject({
      mapGenerationMode: 'fixed',
      customSeed: 73,
      gridColumns: 18,
      gridRows: 12,
    });
  });

  it('возвращает размер карты и сид к значениям по умолчанию', () => {
    useSettingsStore.getState().setCustomSeed(73);
    useSettingsStore.getState().setGridSize(18, 12);
    useSettingsStore.getState().resetStore();

    expect(useSettingsStore.getState()).toMatchObject({
      customSeed: TEMP_START_SEED,
      gridColumns: MAP_PRESETS.large.cols,
      gridRows: MAP_PRESETS.large.rows,
      cellSize: CELL_SIZE,
    });
  });
});
