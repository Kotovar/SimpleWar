import type { MouseEvent } from 'react';

export const getGridCoordsFromEvent = (
  event: MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  cellSize: number,
) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  return {
    x: Math.floor(clickX / cellSize),
    y: Math.floor(clickY / cellSize),
  };
};
