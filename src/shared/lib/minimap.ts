import type { Position } from '@shared/config';
import type { Camera, ViewportSize, WorldSize } from './camera';

/** Размещение мира в области мини-карты: масштаб и отступы по краям. */
export type MinimapLayout = {
  /** CSS-пикселей мини-карты на одну клетку. */
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

/**
 * Вписывает мир в область мини-карты с сохранением пропорций:
 * прямоугольная карта не растягивается, а центрируется.
 *
 * @param world - Размер мира в клетках.
 * @param box - Размер области мини-карты в CSS-пикселях.
 */
export const getMinimapLayout = (
  world: WorldSize,
  box: ViewportSize,
): MinimapLayout => {
  const scale = Math.min(box.width / world.columns, box.height / world.rows);
  const width = world.columns * scale;
  const height = world.rows * scale;

  return {
    scale,
    offsetX: (box.width - width) / 2,
    offsetY: (box.height - height) / 2,
    width,
    height,
  };
};

/** Точка мира в клетках → точка мини-карты. */
export const worldToMinimap = (
  layout: MinimapLayout,
  point: Position,
): Position => ({
  x: layout.offsetX + point.x * layout.scale,
  y: layout.offsetY + point.y * layout.scale,
});

/**
 * Точка мини-карты → точка мира в клетках, прижатая к границам мира:
 * клик по полям вокруг карты ведёт к ближайшему краю.
 *
 * @param world - Размер мира в клетках.
 */
export const minimapToWorld = (
  layout: MinimapLayout,
  world: WorldSize,
  point: Position,
): Position => ({
  x: Math.min(
    world.columns,
    Math.max(0, (point.x - layout.offsetX) / layout.scale),
  ),
  y: Math.min(
    world.rows,
    Math.max(0, (point.y - layout.offsetY) / layout.scale),
  ),
});

/**
 * Рамка окна основной карты на мини-карте, обрезанная границами мира.
 *
 * @returns Прямоугольник в CSS-пикселях мини-карты.
 */
export const getMinimapFrame = (
  layout: MinimapLayout,
  world: WorldSize,
  camera: Camera,
  cellSize: number,
  viewport: ViewportSize,
) => {
  const left = Math.max(0, camera.x);
  const top = Math.max(0, camera.y);
  const right = Math.min(world.columns, camera.x + viewport.width / cellSize);
  const bottom = Math.min(world.rows, camera.y + viewport.height / cellSize);
  const start = worldToMinimap(layout, { x: left, y: top });

  return {
    x: start.x,
    y: start.y,
    width: Math.max(0, right - left) * layout.scale,
    height: Math.max(0, bottom - top) * layout.scale,
  };
};
