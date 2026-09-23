import type { RefObject } from 'react';

const getPixelRatio = () => Math.min(2, window.devicePixelRatio || 1);

/**
 * Готовит слой к рисованию в логических пикселях на экране любой плотности.
 *
 * Буфер канваса увеличивается в `devicePixelRatio` раз, а контекст масштабируется
 * обратно — код отрисовки продолжает работать в координатах клеток.
 */
export const setupCanvas = (
  ref: RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
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

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  return ctx;
};
