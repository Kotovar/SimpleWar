import { useMemo } from 'react';
import {
  getCameraOffset,
  getVisibleRange,
  screenToCell,
  type CellRange,
  type ViewportSize,
} from '@shared/lib';
import type { Position } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { getPixelRatio } from './getCtx';
import { useDevicePixelRatio } from './useDevicePixelRatio';

/** Общая для всех слоёв камера: одна трансформация экран ↔ мир ↔ клетка. */
export type MapView = {
  cellSize: number;
  viewport: ViewportSize;
  /** Сдвиг холста в CSS-пикселях, округлённый до пикселя буфера. */
  offset: Position;
  /** Клетки в окне с запасом: рисуются только они. */
  range: CellRange;
  /** Плотность экрана: при её смене слои пересобирают буфер. */
  pixelRatio: number;
  /** Клетка под точкой относительно левого верхнего угла окна. */
  cellAt: (point: Position) => Position;
};

/**
 * Камера карты для слоёв и ввода. Подписка только на поля вида: смена
 * объектов не пересчитывает трансформацию.
 */
export const useMapView = (): MapView => {
  const cellSize = useSettingsStore(state => state.cellSize);
  const camera = useSettingsStore(state => state.camera);
  const viewport = useSettingsStore(state => state.viewport);
  const columns = useSettingsStore(state => state.gridColumns);
  const rows = useSettingsStore(state => state.gridRows);
  const pixelRatio = useDevicePixelRatio();

  return useMemo(() => {
    const offset = getCameraOffset(camera, cellSize, getPixelRatio());
    // Клик пересчитывается через тот же округлённый сдвиг, что и рисунок.
    const snapped = { x: offset.x / cellSize, y: offset.y / cellSize };

    return {
      cellSize,
      viewport,
      offset,
      range: getVisibleRange(camera, cellSize, viewport, { columns, rows }),
      pixelRatio,
      cellAt: point => screenToCell(snapped, cellSize, point),
    };
  }, [camera, cellSize, columns, pixelRatio, rows, viewport]);
};
