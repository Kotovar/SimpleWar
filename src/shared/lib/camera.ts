import type { Position } from '@shared/config';

/** Левый верхний угол окна карты в клетках мира; дробный. */
export type Camera = Position;

/** Размер области на экране в CSS-пикселях. */
export type ViewportSize = { width: number; height: number };

/** Размер мира в клетках. */
export type WorldSize = { columns: number; rows: number };

/** Диапазон клеток: `x0..x1 - 1` и `y0..y1 - 1`. */
export type CellRange = { x0: number; y0: number; x1: number; y1: number };

/**
 * Переводит точку экрана в координаты мира в клетках.
 *
 * @param camera - Левый верхний угол окна в клетках.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param point - Точка относительно левого верхнего угла области карты.
 * @returns Дробные координаты мира; за пределами карты могут быть отрицательными.
 */
export const screenToWorld = (
  camera: Camera,
  cellSize: number,
  point: Position,
): Position => ({
  x: camera.x + point.x / cellSize,
  y: camera.y + point.y / cellSize,
});

/**
 * Переводит координаты мира в точку экрана.
 *
 * @param camera - Левый верхний угол окна в клетках.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param point - Координаты мира в клетках.
 * @returns Точка относительно левого верхнего угла области карты.
 */
export const worldToScreen = (
  camera: Camera,
  cellSize: number,
  point: Position,
): Position => ({
  x: (point.x - camera.x) * cellSize,
  y: (point.y - camera.y) * cellSize,
});

/**
 * Клетка под точкой экрана.
 *
 * @returns Целые координаты клетки; вне карты — как есть, без ограничения.
 */
export const screenToCell = (
  camera: Camera,
  cellSize: number,
  point: Position,
): Position => {
  const world = screenToWorld(camera, cellSize, point);
  return { x: Math.floor(world.x), y: Math.floor(world.y) };
};

const clampAxis = (
  value: number,
  span: number,
  size: number,
  margin: number,
) => {
  const min = -margin || 0;
  const max = size - span + margin;
  // Мир с полями меньше окна — центрируем, иначе край мира не уходит
  // внутрь окна дальше поля.
  return max < min ? (size - span) / 2 : Math.min(max, Math.max(min, value));
};

/**
 * Ограничивает камеру границами мира; маленький мир центрируется.
 *
 * @param margin - Допустимый выход за край мира в CSS-пикселях: крайние
 *   клетки можно вывести из-под кнопок, лежащих поверх карты.
 * @returns Камера, при которой окно не уходит за края мира дальше поля.
 */
export const clampCamera = (
  camera: Camera,
  cellSize: number,
  viewport: ViewportSize,
  world: WorldSize,
  margin = 0,
): Camera => ({
  x: clampAxis(
    camera.x,
    viewport.width / cellSize,
    world.columns,
    margin / cellSize,
  ),
  y: clampAxis(
    camera.y,
    viewport.height / cellSize,
    world.rows,
    margin / cellSize,
  ),
});

/**
 * Камера после смены масштаба, при которой точка мира под `anchor`
 * остаётся под ним.
 *
 * @param camera - Камера до смены масштаба.
 * @param from - Прежний размер клетки.
 * @param to - Новый размер клетки.
 * @param anchor - Точка экрана, которая не должна сдвинуться.
 * @returns Камера без ограничения границами.
 */
export const zoomCameraAt = (
  camera: Camera,
  from: number,
  to: number,
  anchor: Position,
): Camera => {
  const world = screenToWorld(camera, from, anchor);
  return { x: world.x - anchor.x / to, y: world.y - anchor.y / to };
};

/**
 * Камера, при которой точка мира оказывается в центре окна.
 *
 * @param center - Точка мира в клетках, например `x + 0.5` для центра клетки.
 */
export const centerCameraOn = (
  center: Position,
  cellSize: number,
  viewport: ViewportSize,
): Camera => ({
  x: center.x - viewport.width / cellSize / 2,
  y: center.y - viewport.height / cellSize / 2,
});

/**
 * Наибольший размер клетки, при котором весь мир помещается в окно.
 *
 * @returns Целый размер клетки не меньше 1.
 */
export const getFitCellSize = (viewport: ViewportSize, world: WorldSize) =>
  Math.max(
    1,
    Math.floor(
      Math.min(viewport.width / world.columns, viewport.height / world.rows),
    ),
  );

/**
 * Клетки, попадающие в окно, с запасом по краям.
 *
 * @param margin - Запас в клетках: силуэты и тени у края не обрываются.
 * @returns Диапазон в пределах мира; пустой, если окно вне мира.
 */
export const getVisibleRange = (
  camera: Camera,
  cellSize: number,
  viewport: ViewportSize,
  world: WorldSize,
  margin = 1,
): CellRange => {
  const x0 = Math.max(0, Math.floor(camera.x) - margin);
  const y0 = Math.max(0, Math.floor(camera.y) - margin);
  const x1 = Math.min(
    world.columns,
    Math.ceil(camera.x + viewport.width / cellSize) + margin,
  );
  const y1 = Math.min(
    world.rows,
    Math.ceil(camera.y + viewport.height / cellSize) + margin,
  );

  return { x0, y0, x1: Math.max(x0, x1), y1: Math.max(y0, y1) };
};

/**
 * Сдвиг холста в CSS-пикселях, округлённый до пикселя буфера: границы
 * клеток ложатся на целые пиксели экрана и не расплываются при прокрутке.
 *
 * @param camera - Левый верхний угол окна в клетках.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param ratio - Плотность пикселей буфера.
 */
export const getCameraOffset = (
  camera: Camera,
  cellSize: number,
  ratio: number,
): Position => ({
  x: Math.round(camera.x * cellSize * ratio) / ratio,
  y: Math.round(camera.y * cellSize * ratio) / ratio,
});
