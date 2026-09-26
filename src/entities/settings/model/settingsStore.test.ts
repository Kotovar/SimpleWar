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

  it('возвращает настройки карты к значениям по умолчанию', () => {
    useSettingsStore.getState().setMapGenerationMode('fixed');
    useSettingsStore.getState().setCustomSeed(73);
    useSettingsStore.getState().setGridSize(18, 12);
    useSettingsStore.getState().resetStore();

    expect(useSettingsStore.getState()).toMatchObject({
      mapGenerationMode: 'random',
      customSeed: TEMP_START_SEED,
      gridColumns: MAP_PRESETS.large.cols,
      gridRows: MAP_PRESETS.large.rows,
      cellSize: CELL_SIZE,
    });
  });
});

describe('камера', () => {
  const store = () => useSettingsStore.getState();

  beforeEach(() => {
    store().resetStore();
    store().setGridSize(100, 60);
    store().setViewport(320, 160);
  });

  it('сдвигается и выходит за край мира не дальше поля', () => {
    store().panBy(64, 32);
    expect(store().camera).toEqual({ x: 2, y: 1 });

    // Поле CAMERA_EDGE_MARGIN = 64 px — две клетки по 32 px.
    store().panBy(-1000, -1000);
    expect(store().camera).toEqual({ x: -2, y: -2 });

    store().panBy(100000, 100000);
    // Окно 10 × 5 клеток у правого нижнего края с тем же полем.
    expect(store().camera).toEqual({ x: 92, y: 57 });
  });

  it('при масштабе к точке оставляет под ней ту же клетку', () => {
    store().centerOn(50, 30);
    const anchor = { x: 40, y: 100 };
    const before = {
      x: store().camera.x + anchor.x / store().cellSize,
      y: store().camera.y + anchor.y / store().cellSize,
    };

    store().zoomBy(2, anchor);

    expect(store().camera.x + anchor.x / store().cellSize).toBeCloseTo(
      before.x,
    );
    expect(store().camera.y + anchor.y / store().cellSize).toBeCloseTo(
      before.y,
    );
  });

  it('показывает весь мир целиком и центрирует его', () => {
    store().setViewport(800, 600);
    store().fitWorld();

    expect(store().cellSize).toBe(8);
    expect(store().camera.x).toBe(0);
    // По высоте мир меньше окна: центрирован с полями сверху и снизу.
    expect(store().camera.y).toBeLessThan(0);
  });

  it('маленький мир центрируется в большом окне', () => {
    store().setGridSize(15, 15);
    store().setViewport(1280, 720);
    store().panBy(300, 300);

    expect(store().camera).toEqual({ x: -12.5, y: -3.75 });
  });

  it('при сбросе сохраняет размер окна', () => {
    store().resetStore();
    expect(store().viewport).toEqual({ width: 320, height: 160 });
    expect(store().camera).toEqual({ x: 0, y: 0 });
  });
});
