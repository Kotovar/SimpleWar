import type { RefObject } from 'react';
import type { Position } from '@shared/config';

/** Плотность буфера слоёв: выше 2 разница не видна, а память растёт. */
export const getPixelRatio = () => Math.min(2, window.devicePixelRatio || 1);

/**
 * Готовит слой к рисованию в логических пикселях на экране любой плотности.
 *
 * Буфер канваса увеличивается в `devicePixelRatio` раз, а контекст масштабируется
 * обратно — код отрисовки продолжает работать в координатах клеток. Сдвиг
 * камеры переносит нужную часть мира в окно: холст размером с окно, а не с мир.
 *
 * @param ref - Холст слоя.
 * @param width - Ширина окна в CSS-пикселях.
 * @param height - Высота окна в CSS-пикселях.
 * @param offset - Сдвиг камеры в CSS-пикселях мира.
 */
export const setupCanvas = (
  ref: RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
  offset: Position = { x: 0, y: 0 },
) => {
  const canvas = ref.current;
  if (!canvas) return;

  const ratio = getPixelRatio();
  const bufferWidth = Math.round(width * ratio);
  const bufferHeight = Math.round(height * ratio);

  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(ratio, 0, 0, ratio, -offset.x * ratio, -offset.y * ratio);

  return ctx;
};
